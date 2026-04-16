import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SupabaseService } from '../database/supabase.service'
import { AIService } from '../ai/ai.service'
import { GmailService, GmailMessage } from './gmail.service'

interface EmailAnalysis {
  important: boolean
  type: 'task' | 'note' | 'ignore'
  title: string
  content: string
}

const SYSTEM_PROMPT = `Tu es un assistant familial qui analyse des emails.
Pour chaque email, réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{
  "important": true/false,
  "type": "task" | "note" | "ignore",
  "title": "titre court et clair (max 80 caractères)",
  "content": "résumé ou action à faire (max 300 caractères)"
}

Règles :
- "task" : email qui nécessite une action (rdv à confirmer, facture à payer, document à envoyer...)
- "note" : email informatif important (colis livré, résultats scolaires, info école...)
- "ignore" : publicité, newsletter, promotion, spam
- important: true si type est task ou note, false si ignore
- Réponds toujours en français`

@Injectable()
export class EmailAnalyzerService {
  private readonly logger = new Logger(EmailAnalyzerService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AIService,
    private readonly gmail: GmailService,
  ) {}

  @Cron('0 7 * * *') // tous les jours à 7h du matin
  async analyzeNewEmails(): Promise<void> {
    this.logger.debug('Vérification des nouveaux emails...')

    // Récupère tous les membres avec une intégration Google active
    const { data: integrations } = await this.supabase.db
      .from('member_integrations')
      .select('member_id, access_token, refresh_token, token_expires_at, gmail_last_check')
      .eq('provider', 'google')
      .eq('status', 'active')

    if (!integrations?.length) return

    for (const integration of integrations) {
      await this.processForMember(integration)
    }
  }

  private async processForMember(integration: {
    member_id: string
    access_token: string
    refresh_token: string
    token_expires_at: string
    gmail_last_check: string | null
  }): Promise<void> {
    let token = integration.access_token

    // Rafraîchit le token si expiré
    if (new Date(integration.token_expires_at) <= new Date()) {
      const newToken = await this.gmail.refreshToken(integration.refresh_token)
      if (!newToken) return
      token = newToken
      await this.supabase.db
        .from('member_integrations')
        .update({ access_token: token, token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString() })
        .eq('member_id', integration.member_id)
        .eq('provider', 'google')
    }

    // Détermine depuis quand chercher (dernière vérif ou 24h max)
    const since = integration.gmail_last_check
      ? new Date(integration.gmail_last_check)
      : new Date(Date.now() - 24 * 60 * 60 * 1000)

    const messages = await this.gmail.fetchNewMessages(token, since)
    this.logger.debug(`Membre ${integration.member_id} : ${messages.length} nouveaux emails`)

    // Récupère le family_id du membre
    const { data: member } = await this.supabase.db
      .from('family_members')
      .select('family_id')
      .eq('id', integration.member_id)
      .single()

    for (const message of messages) {
      await this.analyzeAndSave(message, integration.member_id, member?.family_id ?? null)
    }

    // Met à jour la date de dernière vérification
    await this.supabase.db
      .from('member_integrations')
      .update({ gmail_last_check: new Date().toISOString() })
      .eq('member_id', integration.member_id)
      .eq('provider', 'google')
  }

  private async analyzeAndSave(
    message: GmailMessage,
    memberId: string,
    familyId: string | null,
  ): Promise<void> {
    // Vérifie que cet email n'a pas déjà été traité
    const { data: existing } = await this.supabase.db
      .from('email_tasks')
      .select('id')
      .eq('source_email_id', message.id)
      .single()

    if (existing) return

    // Nettoie les champs pour éviter l'injection de prompt
    const safeFrom = message.from.replace(/[<>]/g, '').slice(0, 100)
    const safeSubject = message.subject.replace(/[^\w\s.,!?@:()\-éèêëàâùûüîïôœç]/gi, '').slice(0, 150)
    const safeBody = message.body.replace(/```|<\/?[^>]+>/g, '').slice(0, 500)

    const prompt = `De : ${safeFrom}
Objet : ${safeSubject}
Contenu : ${safeBody}`

    let analysis: EmailAnalysis

    try {
      const raw = await this.ai.generateAgentResponse(prompt, SYSTEM_PROMPT, 'openai', 'gpt-4o-mini')
      analysis = JSON.parse(raw) as EmailAnalysis
    } catch {
      this.logger.warn(`Impossible d'analyser l'email "${message.subject}"`)
      return
    }

    if (!analysis.important || analysis.type === 'ignore') {
      this.logger.debug(`Email ignoré : "${message.subject}"`)
      return
    }

    const { error } = await this.supabase.db
      .from('email_tasks')
      .insert({
        member_id: memberId,
        family_id: familyId,
        type: analysis.type,
        title: analysis.title,
        content: analysis.content,
        source_email_id: message.id,
        source_subject: message.subject,
        source_from: message.from,
        done: false,
      })

    if (error) {
      this.logger.error(`Erreur sauvegarde email_task: ${error.message}`)
    } else {
      this.logger.log(`${analysis.type === 'task' ? 'Tâche' : 'Note'} créée : "${analysis.title}"`)
    }
  }
}
