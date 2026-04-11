import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { Event } from './entities/event.entity'

@Injectable()
export class EventsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(createEventDto: CreateEventDto, userId?: string): Promise<Event> {
    const { data, error } = await this.supabase.db
      .from('events')
      .insert({ ...createEventDto, user_id: userId || null })
      .select()
      .single()
    return assertNoError(data, error, 'EventsService.create') as Event
  }

  async findAll(userId?: string): Promise<Event[]> {
    let query = this.supabase.db
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
    if (userId) query = query.eq('user_id', userId)
    const { data, error } = await query
    return assertNoError(data, error, 'EventsService.findAll') as Event[]
  }

  async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Event[]> {
    let query = this.supabase.db
      .from('events')
      .select('*')
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString())
      .order('start_date', { ascending: true })
    if (userId) query = query.eq('user_id', userId)
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
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundException(`Event #${id} not found`)
    return data as Event
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const { data, error } = await this.supabase.db
      .from('events')
      .update(updateEventDto)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundException(`Event #${id} not found`)
    return data as Event
  }

  async remove(id: string): Promise<void> {
    const { error, count } = await this.supabase.db
      .from('events')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    if (!count) throw new NotFoundException(`Event #${id} not found`)
  }

  async search(query: string, userId?: string): Promise<Event[]> {
    let req = this.supabase.db
      .from('events')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('start_date', { ascending: true })
    if (userId) req = req.eq('user_id', userId)
    const { data, error } = await req
    return assertNoError(data, error, 'EventsService.search') as Event[]
  }
}
