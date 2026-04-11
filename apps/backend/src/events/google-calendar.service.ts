import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, calendar_v3 } from 'googleapis'

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name)
  private calendar: calendar_v3.Calendar | null = null
  readonly isConfigured: boolean

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET')
    const refreshToken = this.config.get<string>('GOOGLE_REFRESH_TOKEN')
    this.isConfigured = !!(clientId && clientSecret && refreshToken)

    if (this.isConfigured) {
      const auth = new google.auth.OAuth2(clientId, clientSecret)
      auth.setCredentials({ refresh_token: refreshToken })
      this.calendar = google.calendar({ version: 'v3', auth })
    }
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn('Google Calendar non configuré (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN manquants)')
      return
    }
    this.logger.log('Google Calendar prêt')
  }

  async createEvent(params: {
    title: string
    start_date: string
    end_date?: string
    description?: string
    location?: string
    all_day?: boolean
    recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  }): Promise<any> {
    const start = new Date(params.start_date)
    const end = params.end_date ? new Date(params.end_date) : new Date(start.getTime() + 60 * 60 * 1000)

    const event: calendar_v3.Schema$Event = {
      summary: params.title,
      description: params.description,
      location: params.location,
      start: params.all_day
        ? { date: start.toISOString().split('T')[0] }
        : { dateTime: start.toISOString(), timeZone: 'Europe/Paris' },
      end: params.all_day
        ? { date: end.toISOString().split('T')[0] }
        : { dateTime: end.toISOString(), timeZone: 'Europe/Paris' },
    }

    if (params.recurrence) {
      const rruleMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
      event.recurrence = [`RRULE:FREQ=${rruleMap[params.recurrence]}`]
    }

    const res = await this.calendar!.events.insert({ calendarId: 'primary', requestBody: event })
    this.logger.log(`Événement créé: ${res.data.summary} (${res.data.id})`)
    return this.formatEvent(res.data)
  }

  async getEventsToday(): Promise<any[]> {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    return this.getEventsByRange(startOfDay, endOfDay)
  }

  async getEventsThisWeek(): Promise<any[]> {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return this.getEventsByRange(monday, sunday)
  }

  async getEventsByRange(start: Date, end: Date): Promise<any[]> {
    const res = await this.calendar!.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })
    return (res.data.items || []).map(this.formatEvent)
  }

  async updateEvent(eventId: string, params: {
    title?: string
    start_date?: string
    end_date?: string
    description?: string
    location?: string
  }): Promise<any> {
    const patch: calendar_v3.Schema$Event = {}
    if (params.title) patch.summary = params.title
    if (params.description) patch.description = params.description
    if (params.location) patch.location = params.location
    if (params.start_date) patch.start = { dateTime: new Date(params.start_date).toISOString(), timeZone: 'Europe/Paris' }
    if (params.end_date) patch.end = { dateTime: new Date(params.end_date).toISOString(), timeZone: 'Europe/Paris' }

    const res = await this.calendar!.events.patch({ calendarId: 'primary', eventId, requestBody: patch })
    return this.formatEvent(res.data)
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.calendar!.events.delete({ calendarId: 'primary', eventId })
    this.logger.log(`Événement supprimé: ${eventId}`)
  }

  async searchEvents(query: string): Promise<any[]> {
    const res = await this.calendar!.events.list({
      calendarId: 'primary',
      q: query,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    return (res.data.items || []).map(this.formatEvent)
  }

  private formatEvent(event: calendar_v3.Schema$Event): any {
    return {
      id: event.id,
      title: event.summary,
      description: event.description,
      location: event.location,
      start_date: event.start?.dateTime || event.start?.date,
      end_date: event.end?.dateTime || event.end?.date,
      all_day: !!event.start?.date,
      html_link: event.htmlLink,
    }
  }
}
