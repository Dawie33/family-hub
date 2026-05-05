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
  folder: string
}

const SYSTEM_PROMPT = `Tu es un assistant familial qui analyse des emails.
Pour chaque email, réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{
  "important": true/false,
  "type": "task" | "note" | "ignore",
  "title": "titre court et clair (max 80 caractères)",
  "content": "résumé ou action à faire (max 300 caractères)",
  "folder": "nom du dossier Gmail (max 30 caractères)"
}

Règles :
- "task" : email qui nécessite une action (rdv à confirmer, facture à payer, document à envoyer...)
- "note" : email informatif important (colis livré, résultats scolaires, info école...)
- "ignore" : publicité, newsletter, promotion, spam
- important: true si type est task ou note, false si ignore
- "folder" : nom court et générique qui regroupe les emails du même expéditeur ou thème
  Exemples : "Ramonage", "École", "Factures EDF", "Amazon", "Médecin", "Banque", "Assurance", "Mairie"
  Utilise toujours le même nom pour le même expéditeur/thème (pas "EDF Facture" et "Facture EDF")
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
  async analyzeNewEmails(allEmails = false, limit?: number): Promise<{ emails: number; saved: number; archived: number }> {
    this.logger.log(allEmails ? 'Analyse complète de la boîte...' : 'Vérification des nouveaux emails...')

    const { data: integrations, error } = await this.supabase.db
      .from('member_integrations')
      .select('member_id, access_token, refresh_token, token_expires_at, gmail_last_check')
      .eq('provider', 'google')
      .eq('status', 'active')

    if (error) this.logger.error(`Erreur lecture intégrations: ${error.message}`)

    if (!integrations?.length) {
      this.logger.warn('Aucune intégration Google active trouvée')
      return { emails: 0, saved: 0, archived: 0 }
    }

    this.logger.log(`${integrations.length} intégration(s) Google trouvée(s)`)

    let totalEmails = 0
    let totalSaved = 0
    let totalArchived = 0

    for (const integration of integrations) {
      const stats = await this.processForMember(integration, allEmails, limit)
      totalEmails += stats.emails
      totalSaved += stats.saved
      totalArchived += stats.archived
    }

    this.logger.log(`Terminé : ${totalEmails} emails trouvés, ${totalSaved} sauvegardés, ${totalArchived} archivés`)
    return { emails: totalEmails, saved: totalSaved, archived: totalArchived }
  }

  private async processForMember(integration: {
    member_id: string
    access_token: string
    refresh_token: string
    token_expires_at: string
    gmail_last_check: string | null
  }, allEmails = false, limit?: number): Promise<{ emails: number; saved: number; archived: number }> {
    let token = integration.access_token

    // Rafraîchit le token si expiré
    if (new Date(integration.token_expires_at) <= new Date()) {
      if (!integration.refresh_token) {
        this.logger.error(`Membre ${integration.member_id} : refresh_token absent — l'utilisateur doit re-autoriser Google dans les paramètres`)
        return { emails: 0, saved: 0, archived: 0 }
      }
      const newToken = await this.gmail.refreshToken(integration.refresh_token)
      if (!newToken) {
        this.logger.error(`Membre ${integration.member_id} : échec du refresh Google (token révoqué ?)`)
        return { emails: 0, saved: 0, archived: 0 }
      }
      token = newToken
      await this.supabase.db
        .from('member_integrations')
        .update({ access_token: token, token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString() })
        .eq('member_id', integration.member_id)
        .eq('provider', 'google')
    }

    const since = allEmails
      ? null
      : integration.gmail_last_check
        ? new Date(integration.gmail_last_check)
        : new Date(Date.now() - 24 * 60 * 60 * 1000)

    let messages = await this.gmail.fetchNewMessages(token, since)
    if (limit && messages.length > limit) messages = messages.slice(0, limit)
    this.logger.debug(`Membre ${integration.member_id} : ${messages.length} nouveaux emails`)

    // Récupère le family_id du membre
    const { data: member } = await this.supabase.db
      .from('family_members')
      .select('family_id')
      .eq('id', integration.member_id)
      .single()

    const labelCache = allEmails ? await this.gmail.listLabels(token) : new Map<string, string>()

    let saved = 0
    let archived = 0

    for (const message of messages) {
      const result = await this.analyzeAndSave(message, integration.member_id, member?.family_id ?? null, token, allEmails, labelCache)
      if (result.saved) saved++
      if (result.archived) archived++
    }

    await this.supabase.db
      .from('member_integrations')
      .update({ gmail_last_check: new Date().toISOString() })
      .eq('member_id', integration.member_id)
      .eq('provider', 'google')

    return { emails: messages.length, saved, archived }
  }

  private async analyzeAndSave(
    message: GmailMessage,
    memberId: string,
    familyId: string | null,
    accessToken: string,
    archive = false,
    labelCache = new Map<string, string>(),
  ): Promise<{ saved: boolean; archived: boolean }> {
    const { data: existing } = await this.supabase.db
      .from('email_tasks')
      .select('id')
      .eq('source_email_id', message.id)
      .single()

    if (existing) return { saved: false, archived: false }

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
      return { saved: false, archived: false }
    }

    let saved = false

    if (!analysis.important || analysis.type === 'ignore') {
      this.logger.debug(`Email ignoré : "${message.subject}"`)
    } else {
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
        saved = true
      }
    }

    let archived = false

    if (archive) {
      if (analysis.type === 'ignore') {
        // Pub/spam : archivé sans créer de dossier
        await this.gmail.moveToLabel(accessToken, message.id, null)
        archived = true
      } else {
        const folderName = analysis.folder?.trim() || 'Divers'
        const labelId = await this.gmail.getOrCreateLabel(accessToken, folderName, labelCache)
        if (labelId) {
          await this.gmail.moveToLabel(accessToken, message.id, labelId)
          this.logger.debug(`Email déplacé dans "${folderName}" : "${message.subject}"`)
          archived = true
        }
      }
    }

    return { saved, archived }
  }
}
