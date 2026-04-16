import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SupabaseService } from '../database/supabase.service'
import { FcmService } from '../fcm/fcm.service'

const DEFAULT_REMINDER_MINUTES = 30

@Injectable()
export class EventRemindersService {
  private readonly logger = new Logger(EventRemindersService.name)
  private readonly sentReminders = new Set<string>()

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fcm: FcmService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingEvents(): Promise<void> {
    try {
      const now = new Date()
      this.logger.debug(`Cron tick — now: ${now.toISOString()}`)

      const { data: events, error } = await this.supabase.db
        .from('family_events')
        .select('id, title, start_date, family_id, location')
        .gte('start_date', now.toISOString())
        .order('start_date', { ascending: true })
        .limit(10)

      if (error) {
        this.logger.error('Erreur requête:', error.message)
        return
      }

      this.logger.debug(`Événements à venir trouvés: ${events?.length ?? 0}`)
      if (!events?.length) return

      for (const event of events) {
        const reminderMinutes = DEFAULT_REMINDER_MINUTES
        const reminderKey = `${event.id}-${reminderMinutes}`

        if (this.sentReminders.has(reminderKey)) continue

        // Force l'interprétation UTC si la chaîne n'a pas de fuseau horaire
        const isoDate = event.start_date.endsWith('Z') || event.start_date.includes('+')
          ? event.start_date
          : event.start_date + 'Z'
        const startDate = new Date(isoDate)
        const minutesUntilStart = (startDate.getTime() - now.getTime()) / 60_000

        this.logger.debug(`"${event.title}" — start_date: ${event.start_date} — dans ${minutesUntilStart.toFixed(1)} min`)

        if (minutesUntilStart <= reminderMinutes && minutesUntilStart > reminderMinutes - 1) {
          await this.sendReminderForEvent(event, reminderMinutes)
          this.sentReminders.add(reminderKey)
        }
      }
    } catch (err) {
      this.logger.error('Erreur checkUpcomingEvents:', (err as Error).message)
    }
  }

  private async sendReminderForEvent(
    event: { id: string; title: string; start_date: string; family_id: string | null; location: string | null },
    reminderMinutes: number,
  ): Promise<void> {
    if (!event.family_id) return

    // Récupère les tokens FCM de tous les membres de la famille
    const { data: members } = await this.supabase.db
      .from('family_members')
      .select('fcm_token')
      .eq('family_id', event.family_id)
      .not('fcm_token', 'is', null)

    if (!members?.length) return

    const tokens = members.map((m) => m.fcm_token as string)
    const startDate = new Date(event.start_date)
    const timeStr = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const body = event.location
      ? `À ${timeStr} — ${event.location}`
      : `À ${timeStr}`

    const sent = await this.fcm.sendToTokens(tokens, {
      title: `📅 ${event.title} dans ${reminderMinutes} min`,
      body,
      data: { eventId: event.id },
    })

    this.logger.log(`Rappel "${event.title}" envoyé à ${sent}/${tokens.length} membres`)
  }
}
