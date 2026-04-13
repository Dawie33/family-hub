import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ChatCompletionTool } from 'openai/resources/chat'
import { AgentsService } from '../agents/agents.service'
import { AIService, ChatMessage, ModelProvider } from '../ai/ai.service'
import { FunctionCall, OpenAIService } from '../ai/openai.service'
import { EventsService } from '../events/events.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PdfService } from '../pdf/pdf.service'
import { ShoppingItem } from '../pdf/dto/shopping-list.dto'
import { MemoryService } from '../memory/memory.service'
import { RecipesService } from '../recipes/recipes.service'
import { AgentRouterService } from './agent-router.service'
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto'
import {
  AGENDA_TOOLS,
  AGENTS_WITH_DELEGATION,
  AGENTS_WITH_PDF,
  AGENTS_WITH_RECIPES,
  AGENTS_WITH_TRAINING_CAMP,
  CATEGORY_CONFIG,
  CATEGORY_ICONS,
  DELEGATION_TOOL,
  IMAGE_GENERATION_AGENTS,
  PDF_SHOPPING_LIST_TOOL,
  RECIPE_AI_TOOLS,
  SAVE_RECIPE_TOOL,
  TRAINING_CAMP_TOOLS,
} from './chat.contantes'
import { SearchService } from './services/search.service'
import { TrainingCampClient } from '../training-camp/training-camp.service'
import { RecipeAiClient } from '../recipe-ai/recipe-ai.service'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private agentsService: AgentsService,
    private aiService: AIService,
    private openAIService: OpenAIService,
    private eventsService: EventsService,
    private agentRouterService: AgentRouterService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
    private searchService: SearchService,
    private memoryService: MemoryService,
    private recipesService: RecipesService,
    private trainingCampClient: TrainingCampClient,
    private recipeAiClient: RecipeAiClient,
  ) {}

  async chat(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    let agent
    let routedAgent: { agentId: string; agentName: string; confidence: number; reasoning: string } | null = null

    // Utiliser le session_id fourni par le frontend, ou un ID stable famille par défaut.
    // IMPORTANT: ne jamais générer un ID aléatoire — les mémoires seraient perdues.
    const sessionId = chatRequest.session_id || 'family_default_session'

    // Si pas d'agent_id fourni, utiliser le routeur automatique avec contexte
    if (!chatRequest.agent_id) {
      routedAgent = await this.agentRouterService.routeWithContext(sessionId, chatRequest.message)
      this.logger.log(
        `Auto-routed to agent: ${routedAgent.agentName} (confidence: ${routedAgent.confidence}) - ${routedAgent.reasoning}`
      )
      agent = await this.agentsService.findOne(routedAgent.agentId)
    } else {
      agent = await this.agentsService.findOne(chatRequest.agent_id)
    }

    if (!agent) {
      throw new NotFoundException(`Agent not found`)
    }

    const category = agent.category || 'general'
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general

    // Cas spécial: Gestionnaire Agenda avec function calling
    if (agent.name === 'gestionnaire_agenda') {
      return this.handleAgendaChat(chatRequest, agent, sessionId)
    }

    // Cas spécial: Coach Nutrition avec Recipe AI
    if (agent.name === 'coach_nutrition') {
      return this.handleNutritionChat(chatRequest, agent, sessionId)
    }

    // Cas spécial: Coach Sport avec function calling pour Training Camp
    if (AGENTS_WITH_TRAINING_CAMP.includes(agent.name)) {
      return this.handleTrainingCampChat(chatRequest, agent, sessionId)
    }

    // Cas spécial: Agents avec delegation vers l'agenda
    if (AGENTS_WITH_DELEGATION.includes(agent.name)) {
      return this.handleChatWithDelegation(chatRequest, agent, sessionId)
    }

    // Cas spécial: Génération d'images avec DALL-E (détection par nom d'agent)
    const imageGenAgent = IMAGE_GENERATION_AGENTS[agent.name]
    if (imageGenAgent) {
      return this.handleImageGeneration(chatRequest, agent, imageGenAgent.isColoring, sessionId)
    }

    // 1. Recherche web si pertinent
    let searchResults = null
    let searchContext = ''
    const isWebResearcher = agent.name === 'chercheur_web'

    const shouldPerformSearch =
      isWebResearcher ||
      (config.searchEnabled && this.searchService.shouldSearch(chatRequest.message, config.searchKeywords))

    if (shouldPerformSearch) {
      if (category === 'vacances') {
        searchResults = await this.searchService.performVacationSearch(chatRequest.message, 5)
      } else {
        const searchCount = isWebResearcher ? 10 : 5
        searchResults = await this.searchService.performSearch(chatRequest.message, searchCount)
      }

      if (searchResults && searchResults.searchResults.length > 0) {
        const maxContext = isWebResearcher ? 8 : category === 'vacances' ? 6 : 3
        searchContext = this.searchService.buildSearchContext(searchResults, maxContext)
      }
    }

    // 2. Construire l'historique des messages
    const conversationHistory: ChatMessage[] = (chatRequest.conversation_history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // 3. Enrichir le system prompt avec les mémoires et la recherche web
    let enrichedPrompt = agent.system_prompt

    const memoryBlock = await this.memoryService.getMemoriesForPrompt(sessionId, category)
    if (memoryBlock) enrichedPrompt += memoryBlock

    if (searchContext) {
      enrichedPrompt += `\n\n## Informations de recherche web\nUtilise ces informations pour enrichir ta réponse et inclus les liens sources pertinents:\n${searchContext}`
    }

    // 4. Générer la réponse
    let response = await this.aiService.generateAgentResponse(
      chatRequest.message,
      enrichedPrompt,
      agent.model_provider as ModelProvider,
      agent.model_name,
      conversationHistory
    )

    // 5. Ajouter les sources si recherche effectuée
    if (searchResults && searchResults.searchResults.length > 0) {
      const maxSources = isWebResearcher ? 8 : 3
      response += this.searchService.formatResultsAsSources(searchResults, maxSources)
    }

    // 6. Chercher une image si pertinent
    let image: string | undefined

    if (config.imageEnabled) {
      const imageQuery = this.searchService.extractImageQuery(category, chatRequest.message, response)
      if (imageQuery) {
        this.logger.log(`Searching image for: ${imageQuery}`)
        image = await this.searchService.searchImage(category, imageQuery, searchResults)
      }
    }

    // Mettre à jour le contexte avec la réponse
    await this.agentRouterService.updateContextWithResponse(sessionId, response)

    // Extraction async des mémoires (fire-and-forget)
    this.memoryService
      .extractAndStoreMemories(sessionId, chatRequest.message, response, category)
      .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

    return {
      response,
      image,
      agent: {
        id: agent.id,
        name: agent.name,
        label: agent.label,
        category: agent.category || 'general',
        icon: CATEGORY_ICONS[agent.category || 'general'],
      },
    }
  }

  /**
   * Gère la génération d'images avec DALL-E
   */
  private async handleImageGeneration(
    chatRequest: ChatRequestDto,
    agent: any,
    isColoring: boolean = false,
    sessionId?: string
  ): Promise<ChatResponseDto> {
    // 1. Utiliser l'IA pour améliorer le prompt
    const coloringInstructions = isColoring
      ? `
IMPORTANT: L'image doit être un dessin de coloriage:
- Style "coloring book page" / "line art"
- Lignes noires épaisses sur fond blanc pur
- Pas de couleurs, pas de nuances de gris
- Formes simples et bien définies
- Adapté pour être imprimé et colorié par un enfant`
      : ''

    const promptEnhancerSystemPrompt = `Tu es un expert en création de prompts pour DALL-E 3.
Ton rôle est de transformer la demande de l'utilisateur en un prompt détaillé et optimisé pour générer une belle image.

Règles:
- Réponds UNIQUEMENT avec le prompt optimisé, rien d'autre
- Le prompt doit être en anglais (DALL-E fonctionne mieux en anglais)
- Ajoute des détails sur le style, l'éclairage, la composition
- Maximum 400 caractères
- Ne mets pas de guillemets autour du prompt${coloringInstructions}`

    const enhancedPrompt = await this.aiService.generateAgentResponse(
      chatRequest.message,
      promptEnhancerSystemPrompt,
      'openai',
      'gpt-4o-mini',
      []
    )

    this.logger.log(`Enhanced prompt: ${enhancedPrompt}`)

    // 2. Générer l'image avec DALL-E
    const imageUrl = await this.aiService.generateImage(enhancedPrompt, '1024x1024', 'standard')

    if (!imageUrl) {
      const errorMsg = isColoring
        ? "Désolé, je n'ai pas pu créer le coloriage. Réessaie avec une autre idée !"
        : "Désolé, je n'ai pas pu générer l'image. Réessaie avec une description différente."
      return this.addAgentInfo({ response: errorMsg, image: undefined }, agent)
    }

    // 3. Générer une réponse descriptive
    const responsePrompt = isColoring
      ? `L'utilisateur a demandé un coloriage: "${chatRequest.message}". J'ai créé un dessin à colorier. Décris brièvement le dessin et donne des suggestions de couleurs pour le colorier.`
      : `L'utilisateur a demandé: "${chatRequest.message}". J'ai généré une image avec le prompt: "${enhancedPrompt}". Décris brièvement ce que tu as créé et donne des suggestions pour améliorer l'image si besoin.`

    const response = await this.aiService.generateAgentResponse(
      responsePrompt,
      agent.system_prompt,
      'openai',
      'gpt-4o-mini',
      []
    )

    return this.addAgentInfo({ response, image: imageUrl }, agent)
  }

  /**
   * Ajoute les infos de l'agent à la réponse
   */
  private addAgentInfo(response: ChatResponseDto, agent: any): ChatResponseDto {
    return {
      ...response,
      agent: {
        id: agent.id,
        name: agent.name,
        label: agent.label,
        category: agent.category || 'general',
        icon: CATEGORY_ICONS[agent.category || 'general'],
      },
    }
  }

  /**
   * Gère les requêtes pour le Gestionnaire Agenda avec function calling
   */
  private async handleAgendaChat(
    chatRequest: ChatRequestDto,
    agent: any,
    sessionId?: string
  ): Promise<ChatResponseDto> {
    // Construire l'historique des messages
    const conversationHistory: ChatMessage[] = (chatRequest.conversation_history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    const agendaMemoryBlock = await this.memoryService.getMemoriesForPrompt(sessionId, agent.category || 'general')

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt + '\n\nDate et heure actuelles: ' + new Date().toISOString() + agendaMemoryBlock,
      },
      ...conversationHistory,
      { role: 'user', content: chatRequest.message },
    ]

    // Appeler l'IA avec les outils d'agenda — 'required' force l'appel d'un outil
    const result = await this.openAIService.chatWithTools(messages, AGENDA_TOOLS, agent.model_name || 'gpt-4o-mini', 'required')

    // Si l'IA a demandé des appels de fonction d'agenda
    if (result.functionCalls.length > 0) {
      const functionResults = await this.executeAgendaFunctions(result.functionCalls, chatRequest.family_id)

      // Générer une réponse finale avec les résultats
      const resultMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: `J'ai exécuté les actions suivantes:\n${functionResults.map(r => `- ${r.function}: ${r.success ? 'Succès' : 'Erreur'}`).join('\n')}\n\nRésultats détaillés:\n${JSON.stringify(
            functionResults.map(r => r.result),
            null,
            2
          )}`,
        },
        {
          role: 'user',
          content: "Résume ce qui a été fait de manière naturelle et conviviale pour l'utilisateur.",
        },
      ]

      const finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')

      return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
    }

    // Si pas d'appel de fonction, retourner la réponse textuelle
    return this.addAgentInfo(
      { response: result.content || "Je n'ai pas compris ta demande concernant l'agenda.", image: undefined },
      agent
    )
  }

  /**
   * Gère les requêtes pour Coach Nutrition avec Recipe AI
   */
  private async handleNutritionChat(
    chatRequest: ChatRequestDto,
    agent: any,
    sessionId?: string,
  ): Promise<ChatResponseDto> {
    const conversationHistory: ChatMessage[] = (chatRequest.conversation_history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    const memoryBlock = await this.memoryService.getMemoriesForPrompt(sessionId, 'nutrition')

    let systemPrompt = agent.system_prompt
    if (!this.recipeAiClient.isConfigured) {
      systemPrompt += "\n\n## Statut Recipe AI\nRecipe AI n'est pas configuré. Génère les recettes par toi-même sans appeler les outils Recipe AI."
    }
    systemPrompt += '\n\nDate et heure actuelles: ' + new Date().toISOString()
    if (memoryBlock) systemPrompt += memoryBlock

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: chatRequest.message },
    ]

    const tools = this.recipeAiClient.isConfigured ? RECIPE_AI_TOOLS : []

    const result = await this.openAIService.chatWithTools(messages, tools, agent.model_name || 'gpt-4o-mini')

    if (result.functionCalls.length > 0) {
      const functionResults = await this.executeNutritionFunctions(result.functionCalls)

      const resultMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: `J'ai exécuté les actions suivantes:\n${functionResults.map(r => `- ${r.function}: ${r.success ? 'Succès' : 'Erreur: ' + r.error}`).join('\n')}\n\nRésultats:\n${JSON.stringify(
            functionResults.map(r => r.result),
            null,
            2,
          )}`,
        },
        {
          role: 'user',
          content: "Présente les résultats de manière naturelle, conviviale et bien structurée pour l'utilisateur. Si c'est une recette, présente-la clairement avec les ingrédients et les étapes. Si c'est une liste de courses, organise-la par catégorie.",
        },
      ]

      const finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')

      this.memoryService
        .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, 'nutrition')
        .catch(err => this.logger.error(`Memory extraction error: ${(err as Error).message}`))

      return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
    }

    // Pas d'appel de fonction — réponse textuelle directe
    const finalResponse = result.content || "Je n'ai pas compris ta demande. Tu peux me demander une recette, un menu de la semaine ou ta liste de courses !"

    this.memoryService
      .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, 'nutrition')
      .catch(err => this.logger.error(`Memory extraction error: ${(err as Error).message}`))

    return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
  }

  /**
   * Exécute les fonctions Recipe AI demandées par le LLM
   */
  private async executeNutritionFunctions(
    functionCalls: FunctionCall[],
  ): Promise<{ function: string; success: boolean; result: any; error?: string }[]> {
    const results: { function: string; success: boolean; result: any; error?: string }[] = []

    for (const call of functionCalls) {
      try {
        let result: any

        switch (call.name) {
          case 'generate_recipe': {
            // Normalise : si le LLM passe un string ou un tableau vide, on le gère
            let ingredients = call.arguments.ingredients as string[] | string | undefined
            if (typeof ingredients === 'string') {
              ingredients = ingredients.split(',').map((s: string) => s.trim()).filter(Boolean)
            }
            if (!ingredients || (ingredients as string[]).length === 0) {
              ingredients = ['poulet', 'légumes de saison']
            }
            result = await this.recipeAiClient.generateRecipe({
              ingredients: ingredients as string[],
              filters: call.arguments.filters as string[] | undefined,
              platTypes: call.arguments.platTypes as string[] | undefined,
              difficulty: call.arguments.difficulty as string | undefined,
              maxDuration: call.arguments.maxDuration as string | undefined,
            })
            break
          }

          case 'generate_meal_plan':
            result = await this.recipeAiClient.generateMealPlan({
              numberOfMeals: call.arguments.numberOfMeals as number,
              numberOfPeople: (call.arguments.numberOfPeople as number) || 4,
              filters: call.arguments.filters as string[] | undefined,
              difficulty: call.arguments.difficulty as string | undefined,
              maxDuration: call.arguments.maxDuration as string | undefined,
            })
            break

          case 'get_saved_recipes':
            result = await this.recipeAiClient.getSavedRecipes()
            break

          case 'save_recipe_to_recipeai':
            result = await this.recipeAiClient.saveRecipe({
              title: call.arguments.title as string,
              ingredients: call.arguments.ingredients as string[],
              steps: call.arguments.steps as string[],
              duration: call.arguments.duration as string,
              difficulty: call.arguments.difficulty as 'débutant' | 'intermédiaire' | 'chef',
            })
            break

          default:
            result = { error: `Fonction inconnue: ${call.name}` }
        }

        results.push({ function: call.name, success: true, result })
      } catch (error) {
        this.logger.error(`Recipe AI function error ${call.name}: ${(error as Error).message}`)
        results.push({ function: call.name, success: false, result: null, error: (error as Error).message })
      }
    }

    return results
  }

  /**
   * Gère les requêtes pour Coach Sport avec function calling pour Training Camp
   */
  private async handleTrainingCampChat(
    chatRequest: ChatRequestDto,
    agent: any,
    sessionId?: string
  ): Promise<ChatResponseDto> {
    if (!this.trainingCampClient.isConfigured) {
      return this.addAgentInfo(
        { response: "Training Camp n'est pas configuré sur ce serveur.", image: undefined },
        agent
      )
    }

    // Construire l'historique des messages
    const conversationHistory: ChatMessage[] = (chatRequest.conversation_history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    const memoryBlock = await this.memoryService.getMemoriesForPrompt(sessionId, 'sports')

    // Enrichir le prompt système avec les données Training Camp
    let systemPrompt = agent.system_prompt
    try {
      const profile = await this.trainingCampClient.getProfile()
      systemPrompt += '\n\n## Statut Training Camp\nTu es connecté à Training Camp. Les données suivantes ont été récupérées automatiquement — utilise-les directement sans redemander de connexion.'
      systemPrompt += '\n\n' + this.trainingCampClient.getProfileSummary(profile)

      const program = await this.trainingCampClient.getActiveProgram()
      if (program) {
        systemPrompt += '\n\n' + this.trainingCampClient.getProgramSummary(program)
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch Training Camp data: ${(error as Error).message}`)
      systemPrompt += '\n\n## Statut Training Camp\nLa connexion à Training Camp a échoué. Informe l\'utilisateur du problème et propose-lui de l\'aider sans les données Training Camp.'
    }

    systemPrompt += '\n\nDate et heure actuelles: ' + new Date().toISOString()
    if (memoryBlock) systemPrompt += memoryBlock

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: chatRequest.message },
    ]

    // Appeler l'IA avec les outils Training Camp + délégation agenda
    const result = await this.openAIService.chatWithTools(
      messages,
      [...TRAINING_CAMP_TOOLS, DELEGATION_TOOL],
      agent.model_name || 'gpt-4o-mini'
    )

    // Si l'IA veut planifier un événement → déléguer à l'agenda
    if (result.functionCalls.some(c => c.name === 'delegate_to_agenda')) {
      const delegationCall = result.functionCalls.find(c => c.name === 'delegate_to_agenda')!
      const delegationResult = await this.executeDelegation(
        delegationCall.arguments.task_description as string,
        delegationCall.arguments.events as any
      )
      const resultMessages: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content: result.content || '' },
        { role: 'user', content: `Résultat de l'ajout à l'agenda: ${delegationResult}\n\nConfirme à l'utilisateur de manière naturelle.` },
      ]
      const finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')
      return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
    }

    // Si l'IA a demandé des appels de fonction Training Camp
    if (result.functionCalls.length > 0) {
      const functionResults = await this.executeTrainingCampFunctions(result.functionCalls)

      // Générer une réponse finale avec les résultats
      const resultMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: `J'ai exécuté les actions suivantes:\n${functionResults.map(r => `- ${r.function}: ${r.success ? 'Succès' : 'Erreur'}`).join('\n')}\n\nRésultats:\n${JSON.stringify(
            functionResults.map(r => r.result),
            null,
            2
          )}`,
        },
        {
          role: 'user',
          content: "Résume ce qui a été fait de manière naturelle et pratique pour l'utilisateur, en français.",
        },
      ]

      const finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')

      // Stocker les nouvelles mémoires
      this.memoryService
        .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, 'sports')
        .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

      return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
    }

    // Si pas d'appel de fonction, retourner la réponse textuelle
    return this.addAgentInfo(
      {
        response: result.content || "Je n'ai pas compris ta demande concernant l'entraînement.",
        image: undefined,
      },
      agent
    )
  }

  /**
   * Exécute les fonctions Training Camp demandées par l'IA
   */
  private async executeTrainingCampFunctions(
    functionCalls: FunctionCall[]
  ): Promise<{ function: string; success: boolean; result: any }[]> {
    const results: { function: string; success: boolean; result: any }[] = []

    for (const call of functionCalls) {
      try {
        let result: any

        switch (call.name) {
          case 'get_user_profile':
            result = await this.trainingCampClient.getProfile()
            break

          case 'get_active_program':
            result = await this.trainingCampClient.getActiveProgram()
            if (!result) {
              result = { message: "Tu n'as pas de programme d'entraînement actif. Veux-tu que j'en génère un ?" }
            }
            break

          case 'get_training_history':
            const limit = (call.arguments.limit as number) || 10
            result = await this.trainingCampClient.getRecentSessions(limit)
            break

          case 'generate_weekly_program':
            const generateParams: any = {}
            if (call.arguments.goal) generateParams.goal = call.arguments.goal
            if (call.arguments.duration_weeks) generateParams.duration_weeks = call.arguments.duration_weeks
            if (call.arguments.sessions_per_week) generateParams.sessions_per_week = call.arguments.sessions_per_week
            result = await this.trainingCampClient.generateProgram(generateParams)
            break

          case 'save_program':
            result = call.arguments.program_preview
              ? await this.trainingCampClient.saveProgram(call.arguments.program_preview)
              : { error: 'Programme manquant' }
            break

          case 'log_workout':
            const workoutData: any = { workout_name: call.arguments.workout_name }
            if (call.arguments.workout_id) workoutData.workout_id = call.arguments.workout_id
            if (call.arguments.elapsed_time_seconds) workoutData.elapsed_time_seconds = call.arguments.elapsed_time_seconds
            if (call.arguments.rounds_completed) workoutData.rounds_completed = call.arguments.rounds_completed
            if (call.arguments.exercises_completed) workoutData.exercises_completed = call.arguments.exercises_completed
            if (call.arguments.notes) workoutData.notes = call.arguments.notes
            result = await this.trainingCampClient.logWorkout(workoutData)
            break

          default:
            result = { error: `Fonction inconnue: ${call.name}` }
        }

        results.push({ function: call.name, success: true, result })
      } catch (error) {
        this.logger.error(`Error executing ${call.name}: ${(error as Error).message}`)
        results.push({ function: call.name, success: false, result: { error: (error as Error).message } })
      }
    }

    return results
  }

  /**
   * Gère les requêtes pour les agents avec capacité de délégation vers l'agenda
   */
  private async handleChatWithDelegation(
    chatRequest: ChatRequestDto,
    agent: any,
    sessionId?: string
  ): Promise<ChatResponseDto> {
    const conversationHistory: ChatMessage[] = (chatRequest.conversation_history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Recherche web si la catégorie le supporte
    const category = agent.category || 'general'
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general
    let searchResults = null
    let searchContext = ''

    const shouldPerformSearch =
      config.searchEnabled && this.searchService.shouldSearch(chatRequest.message, config.searchKeywords)

    this.logger.log(
      `[${agent.name}] category=${category}, searchEnabled=${config.searchEnabled}, shouldSearch=${shouldPerformSearch}`
    )

    if (shouldPerformSearch) {
      // Recherche optimisée pour les vacances (multi-requêtes ciblées)
      if (category === 'vacances') {
        searchResults = await this.searchService.performVacationSearch(chatRequest.message, 5)
      } else {
        searchResults = await this.searchService.performSearch(chatRequest.message, 5)
      }
      if (searchResults && searchResults.searchResults.length > 0) {
        const maxContext = category === 'vacances' ? 6 : 3
        searchContext = this.searchService.buildSearchContext(searchResults, maxContext)
      }
    }

    let enrichedSystemPrompt = agent.system_prompt + '\n\nDate et heure actuelles: ' + new Date().toISOString()

    const delegationMemoryBlock = await this.memoryService.getMemoriesForPrompt(sessionId, category)
    if (delegationMemoryBlock) {
      enrichedSystemPrompt += delegationMemoryBlock
    }

    if (searchContext) {
      enrichedSystemPrompt += `\n\n## Informations de recherche web\nBase tes prix et tarifs UNIQUEMENT sur ces données. Cite les sources avec les liens entre parenthèses. Si un prix n'est pas dans les résultats, indique "prix à vérifier" avec le lien du site officiel:\n${searchContext}`
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: enrichedSystemPrompt },
      ...conversationHistory,
      { role: 'user', content: chatRequest.message },
    ]

    // Déterminer les outils disponibles pour cet agent
    const tools: ChatCompletionTool[] = [DELEGATION_TOOL]
    if (AGENTS_WITH_PDF.includes(agent.name)) {
      tools.push(PDF_SHOPPING_LIST_TOOL)
    }
    if (AGENTS_WITH_RECIPES.includes(agent.name)) {
      tools.push(SAVE_RECIPE_TOOL)
    }

    // Appeler l'IA avec les outils
    const result = await this.openAIService.chatWithTools(messages, tools, agent.model_name || 'gpt-4o-mini')

    // Si l'IA a demandé des appels de fonction
    if (result.functionCalls.length > 0) {
      // Gérer la délégation vers l'agenda
      const delegationCall = result.functionCalls.find(c => c.name === 'delegate_to_agenda')
      if (delegationCall) {
        this.logger.log(`Delegation to agenda requested: ${delegationCall.arguments.task_description}`)

        const delegationResult = await this.executeDelegation(
          delegationCall.arguments.task_description as string,
          delegationCall.arguments.events as
            | Array<{ title: string; date: string; time?: string; description?: string }>
            | undefined
        )

        // Générer une réponse finale combinant le contenu de l'agent et le résultat de la délégation
        const resultMessages: ChatMessage[] = [
          ...messages,
          {
            role: 'assistant',
            content: result.content || '',
          },
          {
            role: 'user',
            content: `Voici le résultat de l'ajout à l'agenda:\n${delegationResult}\n\nRésume ce qui a été fait de manière naturelle pour l'utilisateur, en combinant ta réponse initiale avec cette confirmation.`,
          },
        ]

        let finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')

        if (searchResults && searchResults.searchResults.length > 0) {
          finalResponse += this.searchService.formatResultsAsSources(searchResults, 3)
        }

        this.memoryService
          .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, category)
          .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

        return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
      }

      // Gérer la génération du PDF liste de courses
      const pdfCall = result.functionCalls.find(c => c.name === 'generate_shopping_list_pdf')
      if (pdfCall) {
        this.logger.log('PDF shopping list requested')

        const pdfResult = await this.executeShoppingListPdf(pdfCall.arguments)

        // Créer une notification avec le lien du PDF
        if (pdfResult.success && pdfResult.url) {
          await this.notificationsService.createShoppingListNotification(
            pdfResult.url,
            (pdfCall.arguments.meal_plan_summary as string) || 'Liste de courses'
          )
        }

        // Générer une réponse confirmant la génération
        const resultMessages: ChatMessage[] = [
          ...messages,
          {
            role: 'assistant',
            content: result.content || '',
          },
          {
            role: 'user',
            content: pdfResult.success
              ? `Le PDF de la liste de courses a été généré avec succès! Lien: ${pdfResult.url}\n\nConfirme à l'utilisateur que le PDF est prêt et qu'il peut le télécharger. Mentionne qu'une notification a été créée.`
              : `Erreur lors de la génération du PDF: ${pdfResult.error}\n\nInforme l'utilisateur de l'erreur de manière sympathique.`,
          },
        ]

        const finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')

        this.memoryService
          .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, category)
          .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

        return this.addAgentInfo(
          {
            response: finalResponse,
            image: undefined,
            pdfUrl: pdfResult.url,
          },
          agent
        )
      }

      // Gérer la sauvegarde d'une recette
      const recipeCall = result.functionCalls.find(c => c.name === 'save_recipe')
      if (recipeCall) {
        this.logger.log('Save recipe requested')

        const recipeResult = await this.executeSaveRecipe(recipeCall.arguments)

        const resultMessages: ChatMessage[] = [
          ...messages,
          {
            role: 'assistant',
            content: result.content || '',
          },
          {
            role: 'user',
            content: recipeResult.success
              ? `La recette "${recipeResult.recipe?.title}" a été sauvegardée avec succès dans les favoris (ID: ${recipeResult.recipe?.id})!\n\nConfirme à l'utilisateur que la recette a bien été enregistrée et qu'il peut la retrouver dans la section Recettes.`
              : `Erreur lors de la sauvegarde de la recette: ${recipeResult.error}\n\nInforme l'utilisateur de l'erreur de manière sympathique.`,
          },
        ]

        const finalResponse = await this.openAIService.chat(resultMessages, agent.model_name || 'gpt-4o-mini')

        this.memoryService
          .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, category)
          .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

        return this.addAgentInfo({ response: finalResponse, image: undefined }, agent)
      }
    }

    // Si pas de délégation, retourner la réponse textuelle normale
    if (result.content) {
      let responseText = result.content
      if (searchResults && searchResults.searchResults.length > 0) {
        responseText += this.searchService.formatResultsAsSources(searchResults, 3)
      }

      this.memoryService
        .extractAndStoreMemories(sessionId, chatRequest.message, responseText, category)
        .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

      return this.addAgentInfo({ response: responseText, image: undefined }, agent)
    }

    // Fallback: générer une réponse standard sans outils
    let response = await this.aiService.generateAgentResponse(
      chatRequest.message,
      enrichedSystemPrompt,
      agent.model_provider as ModelProvider,
      agent.model_name,
      conversationHistory
    )

    if (searchResults && searchResults.searchResults.length > 0) {
      response += this.searchService.formatResultsAsSources(searchResults, 3)
    }

    this.memoryService
      .extractAndStoreMemories(sessionId, chatRequest.message, response, category)
      .catch(err => this.logger.error(`Memory extraction error: ${err.message}`))

    return this.addAgentInfo({ response, image: undefined }, agent)
  }

  /**
   * Exécute une délégation vers l'agent Gestionnaire Agenda
   */
  private async executeDelegation(
    taskDescription: string,
    events?: Array<{ title: string; date: string; time?: string; description?: string }>
  ): Promise<string> {
    // Construire le message pour l'agent Agenda
    let message = taskDescription

    if (events && events.length > 0) {
      message += '\n\nÉvénements à créer:\n'
      for (const event of events) {
        message += `- ${event.title} le ${event.date}`
        if (event.time) message += ` à ${event.time}`
        if (event.description) message += ` (${event.description})`
        message += '\n'
      }
    }

    // Trouver l'agent Agenda
    const agendaAgent = await this.agentsService.findOneByName('gestionnaire_agenda')

    if (!agendaAgent) {
      this.logger.error('Gestionnaire Agenda not found for delegation')
      return 'Erreur: Agent Agenda non trouvé'
    }

    // Créer la requête déléguée
    const delegatedRequest: ChatRequestDto = {
      agent_id: agendaAgent.id,
      message,
      conversation_history: [],
    }

    // Appeler handleAgendaChat qui a les outils create_event, etc.
    const result = await this.handleAgendaChat(delegatedRequest, agendaAgent)

    return result.response
  }

  /**
   * Exécute les fonctions d'agenda demandées par l'IA
   */
  private async executeAgendaFunctions(
    functionCalls: FunctionCall[],
    familyId?: string,
  ): Promise<{ function: string; success: boolean; result: any }[]> {
    const results: { function: string; success: boolean; result: any }[] = []

    for (const call of functionCalls) {
      try {
        let result: any

        switch (call.name) {
          case 'create_event':
            result = await this.eventsService.create({
              family_id: familyId,
              title: call.arguments.title as string,
              start_date: call.arguments.start_date as string,
              end_date: call.arguments.end_date as string | undefined,
              description: call.arguments.description as string | undefined,
              location: call.arguments.location as string | undefined,
              all_day: call.arguments.all_day as boolean | undefined,
              category: call.arguments.category as 'appointment' | 'birthday' | 'sport' | 'meal' | 'school' | 'vacation' | 'family' | 'other' | undefined,
              recurrence: call.arguments.recurrence as 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined,
            })
            break

          case 'get_events_today':
            result = await this.eventsService.findToday()
            break

          case 'get_events_week':
            result = await this.eventsService.findThisWeek()
            break

          case 'get_events_range':
            result = await this.eventsService.findByDateRange(
              new Date(call.arguments.start_date as string),
              new Date(call.arguments.end_date as string)
            )
            break

          case 'update_event': {
            const updateData: any = {}
            if (call.arguments.title) updateData.title = call.arguments.title
            if (call.arguments.start_date) updateData.start_date = new Date(call.arguments.start_date as string)
            if (call.arguments.end_date) updateData.end_date = new Date(call.arguments.end_date as string)
            if (call.arguments.description) updateData.description = call.arguments.description
            if (call.arguments.location) updateData.location = call.arguments.location
            result = await this.eventsService.update(call.arguments.event_id as string, updateData)
            break
          }

          case 'delete_event':
            await this.eventsService.remove(call.arguments.event_id as string)
            result = { deleted: true, id: call.arguments.event_id }
            break

          case 'search_events':
            result = await this.eventsService.search(call.arguments.query as string)
            break

          default:
            result = { error: `Fonction inconnue: ${call.name}` }
        }

        results.push({ function: call.name, success: true, result })
      } catch (error) {
        this.logger.error(`Error executing ${call.name}: ${(error as Error).message}`)
        results.push({ function: call.name, success: false, result: { error: (error as Error).message } })
      }
    }

    return results
  }

  /**
   * Génère un PDF de liste de courses
   */
  private async executeShoppingListPdf(
    args: Record<string, unknown>
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const shoppingList = args.shopping_list as ShoppingItem[]
      const summary = args.meal_plan_summary as string | undefined

      const result = await this.pdfService.generateShoppingListPdf(shoppingList, summary)

      this.logger.log(`Shopping list PDF generated: ${result.url}`)
      return { success: true, url: result.url }
    } catch (error) {
      this.logger.error(`PDF generation error: ${(error as Error).message}`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Sauvegarde une recette dans les favoris
   */
  private async executeSaveRecipe(
    args: Record<string, unknown>
  ): Promise<{ success: boolean; recipe?: any; error?: string }> {
    try {
      const recipe = await this.recipesService.create({
        title: args.title as string,
        description: args.description as string | undefined,
        ingredients: (args.ingredients as any[]) || [],
        instructions: args.instructions as string | undefined,
        servings: args.servings as number | undefined,
        prep_time: args.prep_time as number | undefined,
        cook_time: args.cook_time as number | undefined,
        category: args.category as any,
        tags: args.tags as string[] | undefined,
        source: 'chat',
        is_favorite: true,
      })

      this.logger.log(`Recipe saved: ${recipe.title} (ID: ${recipe.id})`)
      return { success: true, recipe }
    } catch (error) {
      this.logger.error(`Save recipe error: ${(error as Error).message}`)
      return { success: false, error: (error as Error).message }
    }
  }
}
