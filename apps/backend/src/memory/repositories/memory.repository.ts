import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { assertNoError } from '../../database/supabase.helpers'
import { IMemoryRepository } from './memory.repository.interface'
import { AgentMemory } from '../entities/memory.entity'

@Injectable()
export class MemoryRepository implements IMemoryRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findBySession(sessionId: string, categories?: string[]): Promise<AgentMemory[]> {
    let query = this.supabase.db
      .from('agent_memories')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (categories && categories.length > 0) {
      query = query.in('category', [...categories, 'general'])
    }

    const { data, error } = await query
    return assertNoError(data, error, 'MemoryRepository.findBySession') as AgentMemory[]
  }

  async findBySessionAndSubject(sessionId: string, subject: string): Promise<AgentMemory | null> {
    const { data, error } = await this.supabase.db
      .from('agent_memories')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .ilike('subject', subject.toLowerCase().trim())
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as AgentMemory | null
  }

  async create(data: Partial<AgentMemory>): Promise<AgentMemory> {
    const { data: memory, error } = await this.supabase.db
      .from('agent_memories')
      .insert(data)
      .select()
      .single()
    return assertNoError(memory, error, 'MemoryRepository.create') as AgentMemory
  }

  async update(id: string, data: Partial<AgentMemory>): Promise<AgentMemory | null> {
    const { data: memory, error } = await this.supabase.db
      .from('agent_memories')
      .update(data)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    return memory as AgentMemory | null
  }

  async markAccessed(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.supabase.db
      .from('agent_memories')
      .update({ last_accessed_at: new Date().toISOString() })
      .in('id', ids)
  }

  async deactivate(id: string): Promise<boolean> {
    const { error } = await this.supabase.db
      .from('agent_memories')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return true
  }

  async findAllActive(categories?: string[]): Promise<AgentMemory[]> {
    let query = this.supabase.db
      .from('agent_memories')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(30)

    if (categories && categories.length > 0) {
      query = query.in('category', [...categories, 'general'])
    }

    const { data, error } = await query
    const memories = assertNoError(data, error, 'MemoryRepository.findAllActive') as AgentMemory[]

    // Dédupliquer par subject (le premier = le plus récent grâce à l'order)
    const seen = new Set<string>()
    return memories.filter((m) => {
      const key = m.subject.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}
