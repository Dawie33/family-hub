import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { assertNoError } from '../../database/supabase.helpers'
import { IAgentsRepository } from './agents.repository.interface'
import { Agent } from '../entities/agent.entity'
import { CreateAgentDto } from '../dto/create-agent.dto'
import { UpdateAgentDto } from '../dto/update-agent.dto'

@Injectable()
export class AgentsRepository implements IAgentsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<Agent[]> {
    const { data, error } = await this.supabase.db
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
    return assertNoError(data, error, 'AgentsRepository.findAll') as Agent[]
  }

  async findById(id: string): Promise<Agent | null> {
    const { data, error } = await this.supabase.db
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as Agent | null
  }

  async findByName(name: string): Promise<Agent | null> {
    const { data, error } = await this.supabase.db
      .from('agents')
      .select('*')
      .eq('name', name)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as Agent | null
  }

  async findByCategory(category: string): Promise<Agent[]> {
    const { data, error } = await this.supabase.db
      .from('agents')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true })
    return assertNoError(data, error, 'AgentsRepository.findByCategory') as Agent[]
  }

  async create(dto: CreateAgentDto): Promise<Agent> {
    const { data, error } = await this.supabase.db
      .from('agents')
      .insert({ ...dto, is_active: dto.is_active ?? true })
      .select()
      .single()
    return assertNoError(data, error, 'AgentsRepository.create') as Agent
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent | null> {
    const { data, error } = await this.supabase.db
      .from('agents')
      .update(dto)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as Agent | null
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase.db
      .from('agents')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return true
  }
}
