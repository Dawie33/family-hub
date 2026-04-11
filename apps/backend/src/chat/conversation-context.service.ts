import { Injectable, Logger } from '@nestjs/common'

interface ConversationContext {
  currentAgent: string | null
  currentAgentId: string | null
  lastQuery: string | null
  lastActivityAt: string
  messageHistory: Array<{ role: string; content: string; agent?: string }>
}

interface CacheEntry {
  context: ConversationContext
  expiresAt: number
}

interface ContextRoutingResult {
  shouldUseSameAgent: boolean
  agentName: string | null
  agentId: string | null
  reasoning: string
}

@Injectable()
export class ConversationContextService {
  private readonly logger = new Logger(ConversationContextService.name)
  private readonly CONTEXT_EXPIRY_MS = 15 * 60 * 1000
  private readonly cache = new Map<string, CacheEntry>()

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt
  }

  private getFromCache(sessionId: string): ConversationContext | null {
    const entry = this.cache.get(sessionId)
    if (!entry) return null
    if (this.isExpired(entry)) {
      this.cache.delete(sessionId)
      return null
    }
    entry.expiresAt = Date.now() + this.CONTEXT_EXPIRY_MS
    return entry.context
  }

  private setInCache(sessionId: string, context: ConversationContext): void {
    this.cache.set(sessionId, {
      context,
      expiresAt: Date.now() + this.CONTEXT_EXPIRY_MS,
    })
  }

  async getContext(sessionId: string): Promise<ConversationContext> {
    const existing = this.getFromCache(sessionId)
    if (existing) return existing

    const newContext: ConversationContext = {
      currentAgent: null,
      currentAgentId: null,
      lastQuery: null,
      lastActivityAt: new Date().toISOString(),
      messageHistory: [],
    }
    this.setInCache(sessionId, newContext)
    return newContext
  }

  async analyzeForContinuation(sessionId: string, userQuery: string): Promise<ContextRoutingResult> {
    const context = await this.getContext(sessionId)

    if (!context.currentAgent || !context.currentAgentId) {
      return { shouldUseSameAgent: false, agentName: null, agentId: null, reasoning: 'Pas de contexte précédent' }
    }

    if (this.isContinuation(userQuery)) {
      this.logger.log(`Suite de conversation détectée → ${context.currentAgent}`)
      return {
        shouldUseSameAgent: true,
        agentName: context.currentAgent,
        agentId: context.currentAgentId,
        reasoning: 'Suite de la conversation précédente',
      }
    }

    return { shouldUseSameAgent: false, agentName: null, agentId: null, reasoning: 'Nouvelle requête détectée' }
  }

  async updateContext(sessionId: string, userQuery: string, agentName: string, agentId: string, assistantResponse?: string): Promise<void> {
    const context = await this.getContext(sessionId)
    context.currentAgent = agentName
    context.currentAgentId = agentId
    context.lastQuery = userQuery
    context.lastActivityAt = new Date().toISOString()

    context.messageHistory.push({ role: 'user', content: userQuery, agent: agentName })
    if (assistantResponse) {
      context.messageHistory.push({
        role: 'assistant',
        content: assistantResponse.length > 500 ? assistantResponse.substring(0, 500) + '...' : assistantResponse,
        agent: agentName,
      })
    }
    if (context.messageHistory.length > 20) {
      context.messageHistory = context.messageHistory.slice(-20)
    }

    this.setInCache(sessionId, context)
  }

  async getConversationHistory(sessionId: string): Promise<Array<{ role: string; content: string; agent?: string }>> {
    const context = await this.getContext(sessionId)
    return context.messageHistory.map(({ role, content, agent }) => ({
      role, content, ...(agent && { agent }),
    }))
  }

  async resetContext(sessionId: string): Promise<void> {
    this.cache.delete(sessionId)
    this.logger.log(`Contexte réinitialisé pour session ${sessionId}`)
  }

  async cleanupExpiredContexts(): Promise<number> {
    let deleted = 0
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        deleted++
      }
    }
    this.logger.log(`${deleted} contextes expirés nettoyés, ${this.cache.size} actifs`)
    return this.cache.size
  }

  private isContinuation(query: string): boolean {
    const trimmedQuery = query.trim().toLowerCase()

    const continuationPatterns = [
      /^(et|puis|ensuite|après|aussi|encore|de même|également)/,
      /^(oui|ok|d'accord|parfait|super|génial|cool|merci|c'est bon)/,
      /^(non|pas ça|autre chose|plutôt|sinon|autrement)/,
      /^(ajoute|mets|rajoute)[\s\-]*(le|la|les|ça|ceci|cela)/,
      /^(montre|donne|affiche|explique)[\s\-]*(moi|nous)/,
      /^(parle|dis)[\s\-]*(moi|nous|m'en)/,
      /^(mon fils|ma fille|mon enfant|mon mari|ma femme|mes enfants|le petit|la petite|notre fils|notre fille)/,
      /^(il adore|elle adore|ils adorent|on adore|j'adore|il aime|elle aime|on aime|j'aime)/,
      /^(il préfère|elle préfère|on préfère|je préfère)/,
      /^(on voudrait|je voudrais|il voudrait|elle voudrait)/,
      /^(par contre|en revanche|d'ailleurs|au fait|sinon|à savoir|pour info)/,
      /^(sachant que|en sachant|étant donné)/,
      /^(et si|pourquoi|comment|quand|où|combien|lequel|laquelle)/,
      /^(c'est quoi|qu'est-ce que|peux-tu|peux tu|peut-tu|peut tu)/,
      /^(réessaie|réessayer|reessaie|reessayer|essaie encore|retry)/,
      /^(tu peux|tu pourrais|essaie de)/,
      /^(plus de détails|précise|développe|continue|vas-y|go)/,
      /\b(le même|la même|pareil|idem|comme ça|ça)\b/,
    ]

    if (trimmedQuery.length < 15 && !trimmedQuery.includes('?')) {
      const newTopicIndicators = [
        /^(recette|menu|météo|actualité|film|livre|image|coloriage)/,
        /^(crée|génère|cherche|trouve|aide)/,
        /training[\s-]?camp/i,
        /\bwod\b/i,
        /\bcrossfit\b/i,
        /\bentraîne/i,
        /\bà la box\b/i,
      ]
      if (!newTopicIndicators.some((p) => p.test(trimmedQuery))) return true
    }

    return continuationPatterns.some((pattern) => pattern.test(trimmedQuery))
  }
}
