import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { AIService, ModelProvider } from '../ai/ai.service'
import { SerperService } from '../ai/serper.service'
import { AgentsService } from '../agents/agents.service'
import { MemoryService } from '../memory/memory.service'
import { Briefing } from './entities/briefing.entity'
import { BriefingConfig } from './briefing.interface'
import { BRIEFING_CONFIGS } from './briefing.constantes'

@Injectable()
export class BriefingsService {
  private readonly logger = new Logger(BriefingsService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly aiService: AIService,
    private readonly serperService: SerperService,
    private readonly agentsService: AgentsService,
    private readonly memoryService: MemoryService,
  ) {}

  async findByDate(date: string): Promise<Briefing[]> {
    const { data, error } = await this.supabase.db
      .from('daily_briefings')
      .select('*')
      .eq('briefing_date', date)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
    return assertNoError(data, error, 'BriefingsService.findByDate') as Briefing[]
  }

  async findToday(): Promise<Briefing[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.findByDate(today)
  }

  async findLatest(): Promise<Briefing[]> {
    const { data, error } = await this.supabase.db
      .from('daily_briefings')
      .select('briefing_date')
      .eq('status', 'completed')
      .order('briefing_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return []
    return this.findByDate((data as any).briefing_date)
  }

  async generateDailyBriefings(force = false): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    this.logger.log(`Generating daily briefings for ${today}${force ? ' (force mode)' : ''}...`)

    for (const config of BRIEFING_CONFIGS) {
      try {
        const { data: existing } = await this.supabase.db
          .from('daily_briefings')
          .select('*')
          .eq('briefing_date', today)
          .eq('category', config.category)
          .maybeSingle()

        if (existing && (existing as any).status === 'completed' && !force) {
          this.logger.log(`Briefing ${config.category} already exists for ${today}, skipping`)
          continue
        }

        if (existing && force) {
          await this.supabase.db.from('daily_briefings').delete().eq('id', (existing as any).id)
          this.logger.log(`Deleted existing briefing ${config.category} for regeneration`)
        }

        await this.generateBriefing(config, today)
        await new Promise((r) => setTimeout(r, 1000))
      } catch (error) {
        this.logger.error(`Failed to generate briefing ${config.category}: ${error.message}`)
      }
    }

    this.logger.log('Daily briefings generation complete')
  }

  private async generateBriefing(config: BriefingConfig, date: string): Promise<void> {
    this.logger.log(`Generating briefing: ${config.category} using agent: ${config.agentName}`)

    const { data: existing } = await this.supabase.db
      .from('daily_briefings')
      .select('*')
      .eq('briefing_date', date)
      .eq('category', config.category)
      .maybeSingle()

    let briefingId: string

    if (existing) {
      await this.supabase.db
        .from('daily_briefings')
        .update({ status: 'running' })
        .eq('id', (existing as any).id)
      briefingId = (existing as any).id
    } else {
      const { data: inserted, error } = await this.supabase.db
        .from('daily_briefings')
        .insert({
          briefing_date: date,
          category: config.category,
          title: config.title,
          content: '',
          icon: config.icon,
          status: 'running',
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      briefingId = (inserted as any).id
    }

    try {
      const agent = await this.agentsService.findOneByName(config.agentName)
      if (!agent) {
        throw new Error(`Agent "${config.agentName}" non trouvé pour le briefing ${config.category}`)
      }

      this.logger.log(`Using agent: ${agent.name} (${agent.model_provider}/${agent.model_name})`)

      let searchContext = ''
      const resultCount = config.searchResultCount ?? 5
      const queries = config.searchQueries?.length
        ? config.searchQueries
        : config.searchQuery
          ? [config.searchQuery]
          : []

      if (queries.length > 0) {
        const allResults: { title: string; snippet: string }[] = []
        for (const query of queries) {
          const searchResults = await this.serperService.search(query, resultCount)
          allResults.push(...searchResults.searchResults)
        }
        if (allResults.length > 0) {
          searchContext = '\n\n## Informations récentes trouvées sur le web\n'
          allResults.forEach((result, i) => {
            searchContext += `${i + 1}. "${result.title}" - ${result.snippet}\n`
          })
        }
      }

      const memoryBlock = await this.memoryService.getMemoriesForBriefing(config.category)
      const hasSearch = queries.length > 0
      const combinedPrompt = hasSearch
        ? `${agent.system_prompt}${memoryBlock}\n\n---\n\n${config.briefingInstructions}${searchContext}`
        : `${config.briefingInstructions}${memoryBlock}`

      const dateInfo = `Nous sommes le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`

      let userMessage: string
      if (config.category === 'citation') {
        userMessage = `Donne-moi une citation inspirante ainsi qu'une brève explication de son contexte et de sa signification.`
      } else if (hasSearch) {
        userMessage = dateInfo + ' Génère le briefing à partir des informations fournies.'
      } else {
        userMessage = dateInfo + ' Génère le contenu demandé.'
      }

      const content = await this.aiService.generateAgentResponse(
        userMessage,
        combinedPrompt,
        agent.model_provider as ModelProvider,
        agent.model_name,
        [],
      )

      await this.supabase.db
        .from('daily_briefings')
        .update({ content, status: 'completed' })
        .eq('id', briefingId)

      this.logger.log(`Briefing ${config.category} generated successfully with agent ${agent.name}`)
    } catch (error) {
      await this.supabase.db
        .from('daily_briefings')
        .update({ status: 'error', error_message: error.message })
        .eq('id', briefingId)
      throw error
    }
  }
}
