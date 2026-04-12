import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { Event } from './entities/event.entity'

const TABLE = 'family_events'

@Injectable()
export class EventsService {
  constructor(private readonly supabase: SupabaseService) {}

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
    return assertNoError(data, error, 'EventsService.create') as Event
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
    return data as Event
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.db
      .from(TABLE)
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
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
