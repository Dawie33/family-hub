import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { Event } from './entities/event.entity'
import { GoogleCalendarService } from './google-calendar.service'

const TABLE = 'family_events'

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  private async getDefaultFamilyId(): Promise<string | null> {
    const { data } = await this.supabase.db
      .from('families')
      .select('id')
      .limit(1)
      .single()
    return data?.id ?? null
  }

  async create(createEventDto: CreateEventDto, userId?: string): Promise<Event> {
    const familyId = createEventDto.family_id || await this.getDefaultFamilyId()
    const { data, error } = await this.supabase.db
      .from(TABLE)
      .insert({
        ...createEventDto,
        family_id: familyId,
        end_date: createEventDto.end_date || createEventDto.start_date,
        created_by: userId || null,
      })
      .select()
      .single()
    const event = assertNoError(data, error, 'EventsService.create') as Event

    // Sync Google Calendar (best-effort, ne bloque pas la réponse)
    if (this.googleCalendar.isConfigured) {
      this.googleCalendar.createEvent({
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date ?? undefined,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        all_day: event.all_day,
        recurrence: event.recurrence ?? undefined,
      })
        .then((gcalEvent) => {
          if (gcalEvent?.id) {
            this.supabase.db.from(TABLE).update({ google_event_id: gcalEvent.id }).eq('id', event.id).then()
          }
        })
        .catch((err: Error) => this.logger.warn(`GCal create failed: ${err.message}`))
    }

    return event
  }

  async findAll(userId?: string): Promise<Event[]> {
    let query = this.supabase.db
      .from(TABLE)
      .select('*')
      .order('start_date', { ascending: true })
    if (userId) query = query.eq('created_by', userId)
    const { data, error } = await query
    return assertNoError(data, error, 'EventsService.findAll') as Event[]
  }

  async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Event[]> {
    let query = this.supabase.db
      .from(TABLE)
      .select('*')
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString())
      .order('start_date', { ascending: true })
    if (userId) query = query.eq('created_by', userId)
    const { data, error } = await query
    return assertNoError(data, error, 'EventsService.findByDateRange') as Event[]
  }

  async findToday(userId?: string): Promise<Event[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return this.findByDateRange(today, tomorrow, userId)
  }

  async findThisWeek(userId?: string): Promise<Event[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)
    return this.findByDateRange(today, endOfWeek, userId)
  }

  async findUpcoming(userId?: string, days = 30): Promise<Event[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days)
    return this.findByDateRange(today, endDate, userId)
  }

  async findOne(id: string): Promise<Event> {
    const { data, error } = await this.supabase.db
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundException(`Event #${id} not found`)
    return data as Event
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const { data, error } = await this.supabase.db
      .from(TABLE)
      .update(updateEventDto)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundException(`Event #${id} not found`)
    const event = data as Event

    // Sync Google Calendar (best-effort)
    if (this.googleCalendar.isConfigured && event.google_event_id) {
      this.googleCalendar.updateEvent(event.google_event_id, {
        title: updateEventDto.title,
        start_date: updateEventDto.start_date,
        end_date: updateEventDto.end_date ?? undefined,
        description: updateEventDto.description ?? undefined,
        location: updateEventDto.location ?? undefined,
      })
        .catch((err: Error) => this.logger.warn(`GCal update failed: ${err.message}`))
    }

    return event
  }

  async remove(id: string): Promise<void> {
    // Récupère l'événement pour avoir le google_event_id avant suppression
    const event = await this.findOne(id).catch(() => null)

    const { error } = await this.supabase.db
      .from(TABLE)
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)

    // Sync Google Calendar (best-effort)
    if (this.googleCalendar.isConfigured && event?.google_event_id) {
      this.googleCalendar.deleteEvent(event.google_event_id)
        .catch((err: Error) => this.logger.warn(`GCal delete failed: ${err.message}`))
    }
  }

  async search(query: string, userId?: string): Promise<Event[]> {
    let req = this.supabase.db
      .from(TABLE)
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('start_date', { ascending: true })
    if (userId) req = req.eq('created_by', userId)
    const { data, error } = await req
    return assertNoError(data, error, 'EventsService.search') as Event[]
  }
}
