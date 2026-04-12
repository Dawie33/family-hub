import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';
import { ConversationContextService } from './conversation-context.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

export interface RoutingResult {
  agentId: string;
  agentName: string;
  confidence: number;
  reasoning: string;
}

// Prompt par défaut si l'agent routeur n'est pas trouvé en base
const DEFAULT_ROUTER_PROMPT = `Tu es un agent routeur. Analyse la demande et choisis l'agent le plus approprié.
Réponds en JSON: {"agent": "nom_agent", "confidence": 0-100, "reasoning": "explication"}`;

@Injectable()
export class AgentRouterService implements OnModuleInit {
  private readonly logger = new Logger(AgentRouterService.name);
  private openai: OpenAI;
  private routerPrompt: string = DEFAULT_ROUTER_PROMPT;

  constructor(
    private agentsService: AgentsService,
    private configService: ConfigService,
    private contextService: ConversationContextService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Charge le prompt du routeur depuis la base de données au démarrage
   */
  async onModuleInit() {
    await this.loadRouterPrompt();
  }

  /**
   * Charge le prompt du routeur depuis la base de données
   */
  private async loadRouterPrompt() {
    try {
      // Utilise findOneByName car l'agent routeur est is_active: false (agent système)
      const routerAgent = await this.agentsService.findOneByName('agent_routeur');

      if (routerAgent?.system_prompt) {
        this.routerPrompt = routerAgent.system_prompt;
        this.logger.log('Prompt du routeur chargé depuis la base de données');
      } else {
        this.logger.warn('Agent Routeur non trouvé en base, utilisation du prompt par défaut');
      }
    } catch (error) {
      this.logger.error(`Erreur lors du chargement du prompt routeur: ${error.message}`);
    }
  }

  /**
   * Recharge le prompt (utile après modification en base)
   */
  async reloadPrompt() {
    await this.loadRouterPrompt();
  }

  /**
   * Route avec gestion du contexte conversationnel
   * Vérifie d'abord si c'est une suite de conversation avant d'appeler le LLM
   */
  async routeWithContext(
    sessionId: string,
    message: string,
  ): Promise<RoutingResult> {
    // Phase 1: Vérifier si c'est une suite de conversation
    const contextAnalysis = await this.contextService.analyzeForContinuation(
      sessionId,
      message,
    );

    if (contextAnalysis.shouldUseSameAgent && contextAnalysis.agentId) {
      this.logger.log(
        `📌 Suite de conversation détectée → ${contextAnalysis.agentName}`,
      );
      return {
        agentId: contextAnalysis.agentId,
        agentName: contextAnalysis.agentName!,
        confidence: 85,
        reasoning: contextAnalysis.reasoning,
      };
    }

    // Phase 2: Routing LLM avec historique du contexte
    const conversationHistory = await this.contextService.getConversationHistory(sessionId);
    const result = await this.routeMessage(message, conversationHistory);

    // Mettre à jour le contexte
    await this.contextService.updateContext(
      sessionId,
      message,
      result.agentName,
      result.agentId,
    );

    return result;
  }

  /**
   * Met à jour le contexte après une réponse de l'agent
   */
  async updateContextWithResponse(
    sessionId: string,
    response: string,
  ): Promise<void> {
    const context = await this.contextService.getContext(sessionId);
    if (context.currentAgent && context.currentAgentId) {
      // Ajouter la réponse à l'historique
      await this.contextService.updateContext(
        sessionId,
        context.lastQuery || '',
        context.currentAgent,
        context.currentAgentId,
        response,
      );
    }
  }

  /**
   * Réinitialise le contexte d'une session
   */
  async resetSessionContext(sessionId: string): Promise<void> {
    await this.contextService.resetContext(sessionId);
  }

  /**
   * Route la demande vers le meilleur agent en utilisant un LLM
   */
  /**
   * Règles d'override par mots-clés — prioritaires sur le LLM et le contexte
   * Format: { agentName, keywords[] } — si UN mot-clé matche → agent forcé
   */
  private readonly KEYWORD_OVERRIDES: Array<{ agentName: string; keywords: RegExp[] }> = [
    {
      agentName: 'coach_sport',
      keywords: [
        /training[\s-]?camp/i,
        /\bwod\b/i,
        /\bcrossfit\b/i,
        /\bentraîne(ment|r)\b/i,
        /\bséance (de sport|de force|de cardio|d'entraînement)\b/i,
        /\bprogramme (sportif|d'entraînement|de musculation)\b/i,
        /\bmusculation\b/i,
        /\bcoach sport\b/i,
        /\bà la box\b/i,
      ],
    },
    {
      agentName: 'gestionnaire_agenda',
      keywords: [
        /\b(ajoute|ajouter|crée|créer|planifie|planifier|mets?|met)\b.{0,20}\b(rdv|rendez-vous|rappel|événement|évènement)\b/i,
        /\b(rdv|rendez-vous)\b.{0,30}\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|aujourd'hui|matin|après-midi|soir|\d{1,2}h)\b/i,
        /\b(supprime|supprimer|annule|annuler|efface)\b.{0,20}\b(rdv|rendez-vous|événement|rappel)\b/i,
        /\bqu[' ]ai-?je\b.{0,20}\b(demain|aujourd'hui|ce soir|cette semaine|prévu)\b/i,
        /\bmon (emploi du temps|planning|agenda)\b/i,
      ],
    },
    {
      agentName: 'famille_organisateur',
      keywords: [
        /\b(famille|familial)\b/i,
        /\b(anniversaire|anniversaires)\b/i,
        /\b(weekend|week-end)\b/i,
        /\b(activité|activités) (famille|familial)\b/i,
      ],
    },
    {
      agentName: 'coach_nutrition',
      keywords: [
        /\b(recette|repas|menu|cuisine|manger)\b/i,
        /\b(pinger|préparer|dîner|déjeuner|petit-déjeuner)\b/i,
        /\b(ingredients|ingrédients|liste de courses)\b/i,
      ],
    },
  ]

  /**
   * Vérifie si la demande correspond à un override par mots-clés
   */
  private checkKeywordOverride(
    message: string,
    activeAgents: any[],
  ): RoutingResult | null {
    for (const rule of this.KEYWORD_OVERRIDES) {
      const matched = rule.keywords.some((kw) => kw.test(message))
      if (matched) {
        const agent = activeAgents.find((a) => a.name === rule.agentName)
        if (agent) {
          this.logger.log(`Keyword override → ${rule.agentName} pour: "${message.substring(0, 50)}"`)
          return {
            agentId: agent.id,
            agentName: agent.name,
            confidence: 99,
            reasoning: `Override par mot-clé détecté dans le message`,
          }
        }
      }
    }
    return null
  }

  async routeMessage(
    message: string,
    conversationHistory?: { role: string; content: string; agent?: string }[],
  ): Promise<RoutingResult> {
    // Récupérer tous les agents actifs (exclure l'agent routeur)
    const agents = await this.agentsService.findAll();
    const activeAgents = agents.filter((a) => a.is_active && a.name !== 'agent_routeur');

    if (activeAgents.length === 0) {
      throw new Error('Aucun agent actif disponible');
    }

    // Override par mots-clés — prioritaire sur le LLM
    const keywordOverride = this.checkKeywordOverride(message, activeAgents)
    if (keywordOverride) return keywordOverride

    try {
      // Construire le contexte
      let contextStr = '';
      if (conversationHistory && conversationHistory.length > 0) {
        const lastMessages = conversationHistory.slice(-3);
        contextStr = `Historique récent de la conversation:\n${lastMessages
          .map((m) => {
            const prefix = m.role === 'user' ? 'Utilisateur' : 'Assistant';
            const agentInfo = m.agent ? ` [via ${m.agent}]` : '';
            return `${prefix}${agentInfo}: ${m.content.substring(0, 150)}...`;
          })
          .join('\n')}`;
      }

      // Construire le prompt avec les placeholders
      const prompt = this.routerPrompt
        .replace('{{USER_QUERY}}', message)
        .replace('{{CONTEXT}}', contextStr || 'Aucun contexte précédent');

      // Ajouter la requête utilisateur à la fin si pas de placeholder
      const finalPrompt = prompt.includes('{{USER_QUERY}}')
        ? prompt
        : `${prompt}\n\nAnalyse maintenant cette demande :\n${message}`;

      // Appel au LLM avec JSON mode
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: finalPrompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Réponse vide du LLM');
      }

      const result = JSON.parse(content);
      this.logger.log(
        `Routing LLM: "${message.substring(0, 50)}..." → ${result.agent} (${result.confidence}%) - ${result.reasoning}`,
      );

      // Trouver l'agent correspondant (comparaison insensible à la casse et aux accents)
      const selectedAgent = this.findAgentByName(result.agent, activeAgents);

      if (selectedAgent) {
        return {
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          confidence: result.confidence,
          reasoning: result.reasoning,
        };
      }

      // Si agent non trouvé, fallback
      this.logger.warn(`Agent "${result.agent}" non trouvé, fallback vers Assistant Général`);
      return this.getFallbackDecision(activeAgents);
    } catch (error) {
      this.logger.error(`Erreur lors du routage LLM: ${error.message}`);
      return this.getFallbackDecision(activeAgents);
    }
  }

  /**
   * Trouve un agent par son nom technique (exact match)
   */
  private findAgentByName(name: string, agents: any[]): any | undefined {
    return agents.find((a) => a.name === name);
  }

  /**
   * Retourne une décision par défaut (Assistant Général)
   */
  private getFallbackDecision(activeAgents: any[]): RoutingResult {
    const generalAgent =
      activeAgents.find((a) => a.category === 'general') || activeAgents[0];
    return {
      agentId: generalAgent.id,
      agentName: generalAgent.name,
      confidence: 30,
      reasoning: 'Routage par défaut vers l\'assistant général',
    };
  }
}
