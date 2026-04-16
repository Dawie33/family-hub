import { Injectable, Logger } from '@nestjs/common'
import { ChatCompletionTool } from 'openai/resources/chat'
import { AIService, ChatMessage } from '../ai/ai.service'
import { FunctionCall, OpenAIService } from '../ai/openai.service'
import { EventsService } from '../events/events.service'
import { PdfService } from '../pdf/pdf.service'
import { ShoppingItem } from '../pdf/dto/shopping-list.dto'
import { MemoryService } from '../memory/memory.service'
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto'
import {
  AGENDA_TOOLS,
  PUSH_NOTIFICATION_TOOL,
  RECIPE_AI_TOOLS,
  RECIPE_URL_TOOL,
  TRAINING_CAMP_TOOLS,
} from './chat.contantes'
import { SearchService } from './services/search.service'
import { RecipeExtractorService } from './services/recipe-extractor.service'
import { FcmService } from '../fcm/fcm.service'
import { TrainingCampClient } from '../training-camp/training-camp.service'
import { RecipeAiClient } from '../recipe-ai/recipe-ai.service'
import { SupabaseService } from '../database/supabase.service'

// ─── Sets de noms d'outils pour routage ──────────────────────────────────────

const AGENDA_TOOL_NAMES = new Set(['create_event', 'get_events_today', 'get_events_week', 'get_events_range', 'update_event', 'delete_event', 'search_events'])
const RECIPE_AI_TOOL_NAMES = new Set(['generate_recipe', 'generate_meal_plan', 'get_saved_recipes', 'save_recipe_to_recipeai'])
const TRAINING_CAMP_TOOL_NAMES = new Set(['get_user_profile', 'get_active_program', 'get_training_history', 'generate_weekly_program', 'save_program', 'log_workout'])

// ─── Outil génération image ───────────────────────────────────────────────────

const IMAGE_GENERATION_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'generate_image',
    description: "Génère une image avec DALL-E 3. Utilise cet outil quand l'utilisateur demande explicitement une image, un dessin, un coloriage ou une illustration.",
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description détaillée de l\'image à générer, en anglais, max 400 caractères',
        },
        is_coloring: {
          type: 'boolean',
          description: 'Si true, génère un dessin de coloriage (lignes noires sur fond blanc, sans couleurs)',
        },
      },
      required: ['prompt'],
    },
  },
}

// ─── System prompt unifié ─────────────────────────────────────────────────────

const UNIFIED_SYSTEM_PROMPT = `Tu es l'Assistant Familial de FamilyHub, un assistant intelligent qui aide toute la famille au quotidien. Tu as accès à plusieurs outils que tu utilises proactivement selon le besoin.

## Tes compétences

### 🗓️ Agenda familial
Tu peux créer, modifier, supprimer et consulter les événements du calendrier familial. Utilise les outils agenda dès qu'on te parle de rendez-vous, événements, planning, horaires.

### 🍽️ Nutrition & Recettes
Tu peux générer des recettes sur mesure, créer un menu de la semaine avec liste de courses automatique. Quand tu génères un menu complet, sauvegarde toujours les recettes et génère la liste de courses PDF.

### 🏋️ Sport & Entraînement
Si Training Camp est connecté, tu peux consulter le profil sportif, les programmes d'entraînement, l'historique des séances et créer de nouveaux programmes.

### 🎨 Génération d'images
Tu peux créer des images et des coloriages avec DALL-E. Utilise l'outil generate_image dès qu'on te demande une image, un dessin ou un coloriage.

### 🔍 Culture générale & aide
Tu peux aider aux devoirs, conseiller des livres, films, jeux vidéo, planifier des vacances et répondre à toutes les questions de la famille.

## Règles importantes
- Tu réponds toujours en français, de manière chaleureuse et familiale
- Tu utilises les outils disponibles de manière proactive sans attendre qu'on te le demande explicitement
- Pour un menu de la semaine : génère le plan → sauvegarde les recettes → génère la liste de courses PDF (dans cet ordre)
- Tu peux combiner plusieurs compétences en une seule réponse (ex: créer une recette ET l'ajouter au calendrier)
- Quand tu ne sais pas quelque chose de précis (prix, horaires, actualités), dis-le clairement`

// ─── Mots-clés déclenchant une recherche web ─────────────────────────────────

const SEARCH_KEYWORDS = [
  'prix', 'tarif', 'coût', 'combien', 'horaire', 'séance', 'film', 'série',
  'actualité', 'news', 'voyage', 'vacances', 'hôtel', 'vol', 'billet',
  'livre', 'sortie', 'jeu', 'soluce', 'astuce', 'définition', 'découverte',
  'invention', 'science', 'histoire', 'météo', 'disneyland', 'disney', 'parc',
]

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private aiService: AIService,
    private openAIService: OpenAIService,
    private eventsService: EventsService,
    private pdfService: PdfService,
    private searchService: SearchService,
    private memoryService: MemoryService,
    private trainingCampClient: TrainingCampClient,
    private recipeAiClient: RecipeAiClient,
    private supabase: SupabaseService,
    private recipeExtractorService: RecipeExtractorService,
    private fcmService: FcmService,
  ) {}

  async chat(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = chatRequest.session_id || 'family_default_session'

    // 1. Construire le system prompt
    let systemPrompt = UNIFIED_SYSTEM_PROMPT
    systemPrompt += `\n\nDate et heure actuelles: ${new Date().toISOString()}`

    // Mémoires de session
    const memoryBlock = await this.memoryService.getMemoriesForPrompt(sessionId, 'general')
    if (memoryBlock) systemPrompt += memoryBlock

    // Données Training Camp si disponible
    if (this.trainingCampClient.isConfigured) {
      try {
        const profile = await this.trainingCampClient.getProfile()
        systemPrompt += '\n\n## Données Training Camp\n' + this.trainingCampClient.getProfileSummary(profile)
        const program = await this.trainingCampClient.getActiveProgram()
        if (program) systemPrompt += '\n\n' + this.trainingCampClient.getProgramSummary(program)
      } catch {
        systemPrompt += '\n\n## Training Camp\nConnexion indisponible en ce moment.'
      }
    }

    // Statut Recipe AI
    if (!this.recipeAiClient.isConfigured) {
      systemPrompt += "\n\n## Recipe AI\nNon configuré — génère les recettes par toi-même sans appeler les outils Recipe AI."
    }

    // 2. Recherche web si pertinent (pré-LLM, basée sur mots-clés)
    let searchContext = ''
    let searchResults: any = null
    const shouldSearch = this.searchService.shouldSearch(chatRequest.message, SEARCH_KEYWORDS)
    if (shouldSearch) {
      searchResults = await this.searchService.performSearch(chatRequest.message, 5)
      if (searchResults?.searchResults?.length > 0) {
        searchContext = this.searchService.buildSearchContext(searchResults, 4)
        systemPrompt += `\n\n## Informations web actualisées\n${searchContext}`
      }
    }

    // 3. Construire les outils disponibles
    const tools = this.buildTools()

    // 4. Construire les messages
    const conversationHistory: ChatMessage[] = (chatRequest.conversation_history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: chatRequest.message },
    ]

    // 5. Appel LLM principal
    const result = await this.openAIService.chatWithTools(messages, tools, 'gpt-4o-mini')

    // 6. Exécuter les outils demandés
    if (result.functionCalls.length > 0) {
      const toolResults = await this.executeTools(result.functionCalls, chatRequest)

      // 7. Second appel LLM pour formater la réponse
      const resultMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: `J'ai exécuté les actions suivantes:\n${toolResults.map(r => `- ${r.function}: ${r.success ? 'Succès' : 'Erreur: ' + r.error}`).join('\n')}\n\nRésultats:\n${JSON.stringify(toolResults.map(r => r.result), null, 2)}`,
        },
        {
          role: 'user',
          content: "Présente les résultats de manière naturelle et conviviale en français. Si c'est une recette, présente-la clairement. Si c'est un agenda, confirme ce qui a été fait. Si c'est une image, décris ce que tu as créé.",
        },
      ]

      const finalResponse = await this.openAIService.chat(resultMessages, 'gpt-4o-mini')

      // Générer PDF si generate_meal_plan réussi
      let pdfUrl: string | undefined
      const mealPlanResult = toolResults.find(r => r.function === 'generate_meal_plan' && r.success)
      if (mealPlanResult?.result?.shoppingList?.length > 0) {
        pdfUrl = await this.handleMealPlanSave(mealPlanResult.result, chatRequest.family_id)
      }

      // Image générée ?
      const imageResult = toolResults.find(r => r.function === 'generate_image' && r.success)
      const image = imageResult?.result?.url

      this.memoryService
        .extractAndStoreMemories(sessionId, chatRequest.message, finalResponse, 'general')
        .catch(err => this.logger.error(`Memory extraction error: ${(err as Error).message}`))

      return { response: finalResponse, image, pdfUrl }
    }

    // Pas d'outil — réponse textuelle directe
    let response = result.content || "Je n'ai pas pu traiter ta demande."
    if (searchResults?.searchResults?.length > 0) {
      response += this.searchService.formatResultsAsSources(searchResults, 3)
    }

    this.memoryService
      .extractAndStoreMemories(sessionId, chatRequest.message, response, 'general')
      .catch(err => this.logger.error(`Memory extraction error: ${(err as Error).message}`))

    return { response }
  }

  // ─── Construction des outils disponibles ───────────────────────────────────

  private buildTools(): ChatCompletionTool[] {
    const tools: ChatCompletionTool[] = [
      ...AGENDA_TOOLS,
      IMAGE_GENERATION_TOOL,
      RECIPE_URL_TOOL,
      PUSH_NOTIFICATION_TOOL,
    ]

    if (this.recipeAiClient.isConfigured) {
      tools.push(...RECIPE_AI_TOOLS)
    }

    if (this.trainingCampClient.isConfigured) {
      tools.push(...TRAINING_CAMP_TOOLS)
    }

    return tools
  }

  // ─── Exécution unifiée de tous les outils ──────────────────────────────────

  private async executeTools(
    functionCalls: FunctionCall[],
    chatRequest: ChatRequestDto,
  ): Promise<{ function: string; success: boolean; result: any; error?: string }[]> {
    const results: { function: string; success: boolean; result: any; error?: string }[] = []

    for (const call of functionCalls) {
      try {
        let result: any

        // Agenda
        if (AGENDA_TOOL_NAMES.has(call.name)) {
          result = await this.executeAgendaTool(call, chatRequest.family_id)
        }
        // Recipe AI
        else if (RECIPE_AI_TOOL_NAMES.has(call.name)) {
          result = await this.executeRecipeTool(call)
        }
        // Training Camp
        else if (TRAINING_CAMP_TOOL_NAMES.has(call.name)) {
          result = await this.executeTrainingTool(call)
        }
        // Image
        else if (call.name === 'generate_image') {
          result = await this.executeImageGeneration(call)
        }
        // Extraction URL
        else if (call.name === 'extract_recipe_from_url') {
          result = await this.executeRecipeUrlExtraction(call)
        }
        // Notification push
        else if (call.name === 'send_push_notification') {
          result = await this.executePushNotification(call)
        }
        else {
          result = { error: `Outil inconnu: ${call.name}` }
        }

        results.push({ function: call.name, success: true, result })
      } catch (error) {
        this.logger.error(`Tool error [${call.name}]: ${(error as Error).message}`)
        results.push({ function: call.name, success: false, result: null, error: (error as Error).message })
      }
    }

    return results
  }

  // ─── Outils Agenda ─────────────────────────────────────────────────────────

  private async executeAgendaTool(call: FunctionCall, familyId?: string): Promise<any> {
    const args = call.arguments
    switch (call.name) {
      case 'create_event': {
        const event = await this.eventsService.create({
          title: args.title as string,
          start_date: args.date as string,
          end_date: (args.end_date as string) || (args.date as string),
          description: args.description as string | undefined,
          category: ((args.category as string) || 'other') as any,
          family_id: familyId,
        })
        return { success: true, event }
      }
      case 'get_events_today': {
        const events = await this.eventsService.findToday()
        return { events, count: events.length }
      }
      case 'get_events_week': {
        const events = await this.eventsService.findThisWeek()
        return { events, count: events.length }
      }
      case 'get_events_range': {
        const events = await this.eventsService.findByDateRange(
          new Date(args.start_date as string),
          new Date(args.end_date as string),
        )
        return { events, count: events.length }
      }
      case 'update_event': {
        const updated = await this.eventsService.update(args.event_id as string, {
          title: args.title as string | undefined,
          start_date: args.date as string | undefined,
          description: args.description as string | undefined,
          category: args.category as any | undefined,
        })
        return { success: true, event: updated }
      }
      case 'delete_event': {
        await this.eventsService.remove(args.event_id as string)
        return { success: true }
      }
      case 'search_events': {
        const events = await this.eventsService.search(args.query as string)
        return { events, count: events.length }
      }
      default:
        return { error: `Outil agenda inconnu: ${call.name}` }
    }
  }

  // ─── Outils Recipe AI ──────────────────────────────────────────────────────

  private async executeRecipeTool(call: FunctionCall): Promise<any> {
    const args = call.arguments
    switch (call.name) {
      case 'generate_recipe': {
        let ingredients = args.ingredients as string[] | string | undefined
        if (typeof ingredients === 'string') {
          ingredients = ingredients.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
        if (!ingredients || (ingredients as string[]).length === 0) {
          ingredients = ['poulet', 'légumes de saison']
        }
        return this.recipeAiClient.generateRecipe({
          ingredients: ingredients as string[],
          filters: args.filters as string[] | undefined,
          platTypes: args.platTypes as string[] | undefined,
          difficulty: args.difficulty as string | undefined,
          maxDuration: args.maxDuration as string | undefined,
        })
      }
      case 'generate_meal_plan':
        return this.recipeAiClient.generateMealPlan({
          numberOfMeals: args.numberOfMeals as number,
          numberOfPeople: (args.numberOfPeople as number) || 4,
          filters: args.filters as string[] | undefined,
          difficulty: args.difficulty as string | undefined,
          maxDuration: args.maxDuration as string | undefined,
        })
      case 'get_saved_recipes':
        return this.recipeAiClient.getSavedRecipes()
      case 'save_recipe_to_recipeai':
        return this.recipeAiClient.saveRecipe({
          title: args.title as string,
          ingredients: args.ingredients as string[],
          steps: args.steps as string[],
          duration: args.duration as string,
          difficulty: args.difficulty as 'débutant' | 'intermédiaire' | 'chef',
        })
      default:
        return { error: `Outil nutrition inconnu: ${call.name}` }
    }
  }

  // ─── Outils Training Camp ──────────────────────────────────────────────────

  private async executeTrainingTool(call: FunctionCall): Promise<any> {
    const args = call.arguments
    switch (call.name) {
      case 'get_user_profile':
        return this.trainingCampClient.getProfile()
      case 'get_active_program': {
        const program = await this.trainingCampClient.getActiveProgram()
        return program || { message: "Pas de programme actif. Veux-tu que j'en génère un ?" }
      }
      case 'get_training_history':
        return this.trainingCampClient.getRecentSessions((args.limit as number) || 10)
      case 'generate_weekly_program': {
        const params: any = {}
        if (args.goal) params.goal = args.goal
        if (args.duration_weeks) params.duration_weeks = args.duration_weeks
        if (args.sessions_per_week) params.sessions_per_week = args.sessions_per_week
        return this.trainingCampClient.generateProgram(params)
      }
      case 'save_program':
        return args.program_preview
          ? this.trainingCampClient.saveProgram(args.program_preview)
          : { error: 'Programme manquant' }
      case 'log_workout': {
        const data: any = { workout_name: args.workout_name }
        if (args.workout_id) data.workout_id = args.workout_id
        if (args.elapsed_time_seconds) data.elapsed_time_seconds = args.elapsed_time_seconds
        if (args.rounds_completed) data.rounds_completed = args.rounds_completed
        if (args.exercises_completed) data.exercises_completed = args.exercises_completed
        if (args.notes) data.notes = args.notes
        return this.trainingCampClient.logWorkout(data)
      }
      default:
        return { error: `Outil sport inconnu: ${call.name}` }
    }
  }

  // ─── Outil Image ───────────────────────────────────────────────────────────

  private async executeImageGeneration(call: FunctionCall): Promise<any> {
    const { prompt, is_coloring } = call.arguments

    let finalPrompt = prompt as string
    if (is_coloring) {
      finalPrompt += ', coloring book page, thick black outlines on pure white background, no colors, no shading, simple clean shapes, suitable for children to color'
    }

    const url = await this.aiService.generateImage(finalPrompt, '1024x1024', 'standard')
    if (!url) throw new Error('DALL-E n\'a pas retourné d\'image')
    return { url, prompt: finalPrompt }
  }

  // ─── Outil Notification Push ───────────────────────────────────────────────

  private async executePushNotification(call: FunctionCall): Promise<any> {
    const { title, body } = call.arguments

    // Récupère tous les tokens FCM des membres de la famille
    const { data: members } = await this.supabase.db
      .from('family_members')
      .select('fcm_token')
      .not('fcm_token', 'is', null)

    const tokens = (members ?? [])
      .map((m: any) => m.fcm_token as string)
      .filter(Boolean)

    if (tokens.length === 0) {
      return { sent: 0, message: 'Aucun appareil enregistré pour les notifications' }
    }

    const sent = await this.fcmService.sendToTokens(tokens, { title: title as string, body: body as string })
    return { sent, total: tokens.length }
  }

  // ─── Outil Extraction URL ──────────────────────────────────────────────────

  private async executeRecipeUrlExtraction(call: FunctionCall): Promise<any> {
    const { url, save = true } = call.arguments

    const recipe = await this.recipeExtractorService.extractFromUrl(url as string)

    if (save && this.recipeAiClient.isConfigured) {
      await this.recipeAiClient.saveRecipe({
        title: recipe.title,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        duration: recipe.duration,
        difficulty: recipe.difficulty,
      })
      return { ...recipe, saved: true }
    }

    return { ...recipe, saved: false }
  }

  // ─── Sauvegarde menu + PDF ──────────────────────────────────────────────────

  private async handleMealPlanSave(mealPlanResult: any, familyId?: string): Promise<string | undefined> {
    const recipes: any[] = mealPlanResult.recipes ?? []

    // Sauvegarde des recettes — PDF annulé si une échoue
    const saveResults = await Promise.allSettled(
      recipes.map((recipe: any) =>
        this.recipeAiClient.saveRecipe({
          title: recipe.title,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          duration: recipe.duration,
          difficulty: recipe.difficulty,
          nutrition: recipe.nutrition,
          filters: recipe.filters,
          cuisine_type: recipe.cuisine_type,
        }),
      ),
    )

    const failures = saveResults.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      failures.forEach((r, i) =>
        this.logger.error(`Save recipe failed (recette ${i + 1}): ${(r as PromiseRejectedResult).reason?.message}`)
      )
      this.logger.warn(`${failures.length} recette(s) non sauvegardée(s) — PDF annulé`)
      return undefined
    }

    this.logger.log(`${recipes.length} recette(s) sauvegardée(s)`)

    try {
      const flatItems: ShoppingItem[] = mealPlanResult.shoppingList.flatMap(
        (cat: { category: string; items: string[] }) =>
          cat.items.map((item: string) => ({ item, category: cat.category })),
      )
      const titles = recipes.map((r: any, i: number) => `Repas ${i + 1}: ${r.title}`).join(', ')

      const pdf = await this.pdfService.generateShoppingListPdf(flatItems, titles)

      await this.saveShoppingList({
        familyId,
        shoppingList: mealPlanResult.shoppingList,
        mealSummary: titles,
        pdfUrl: pdf.url,
      })

      return pdf.url
    } catch (err) {
      this.logger.error(`PDF/shopping list save error: ${(err as Error).message}`)
      return undefined
    }
  }

  // ─── Sauvegarde liste de courses Supabase ───────────────────────────────────

  private async saveShoppingList(params: {
    familyId?: string
    shoppingList: { category: string; items: string[] }[]
    mealSummary: string
    pdfUrl: string
  }): Promise<void> {
    const listName = `Liste de courses — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`

    const { data: list, error: listError } = await this.supabase.db
      .from('shopping_lists')
      .insert({ family_id: params.familyId ?? null, name: listName, color: '#4784EC', is_shared: true })
      .select('id')
      .single()

    if (listError || !list) {
      this.logger.error(`shopping_lists insert error: ${listError?.message}`)
      return
    }

    const itemRows = params.shoppingList.flatMap(cat =>
      cat.items.map(item => ({
        list_id: list.id,
        name: item,
        quantity: null as string | null,
        unit: cat.category,
        checked: false,
      })),
    )

    const { error: itemsError } = await this.supabase.db.from('shopping_items').insert(itemRows)
    if (itemsError) {
      this.logger.error(`shopping_items insert error: ${itemsError.message}`)
      return
    }

    this.logger.log(`Liste de courses sauvegardée (${itemRows.length} articles) — id: ${list.id}`)
  }
}
