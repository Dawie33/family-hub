import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { CreateRecipeDto } from './dto/create-recipe.dto'
import { UpdateRecipeDto } from './dto/update-recipe.dto'
import { Recipe } from './entities/recipe.entity'

@Injectable()
export class RecipesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(createRecipeDto: CreateRecipeDto, userId?: string): Promise<Recipe> {
    const { data, error } = await this.supabase.db
      .from('recipes')
      .insert({ ...createRecipeDto, user_id: userId || null })
      .select()
      .single()
    return assertNoError(data, error, 'RecipesService.create') as Recipe
  }

  async findAll(userId?: string): Promise<Recipe[]> {
    let query = this.supabase.db.from('recipes').select('*').order('created_at', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    const { data, error } = await query
    return assertNoError(data, error, 'RecipesService.findAll') as Recipe[]
  }

  async findFavorites(userId?: string): Promise<Recipe[]> {
    let query = this.supabase.db
      .from('recipes')
      .select('*')
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    const { data, error } = await query
    return assertNoError(data, error, 'RecipesService.findFavorites') as Recipe[]
  }

  async findByCategory(category: string, userId?: string): Promise<Recipe[]> {
    let query = this.supabase.db
      .from('recipes')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    const { data, error } = await query
    return assertNoError(data, error, 'RecipesService.findByCategory') as Recipe[]
  }

  async findOne(id: string): Promise<Recipe> {
    const { data, error } = await this.supabase.db
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundException(`Recipe #${id} not found`)
    return data as Recipe
  }

  async search(query: string, userId?: string): Promise<Recipe[]> {
    let req = this.supabase.db
      .from('recipes')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
    if (userId) req = req.eq('user_id', userId)
    const { data, error } = await req
    return assertNoError(data, error, 'RecipesService.search') as Recipe[]
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const { data, error } = await this.supabase.db
      .from('recipes')
      .update(updateRecipeDto)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundException(`Recipe #${id} not found`)
    return data as Recipe
  }

  async toggleFavorite(id: string): Promise<Recipe> {
    const recipe = await this.findOne(id)
    const { data, error } = await this.supabase.db
      .from('recipes')
      .update({ is_favorite: !recipe.is_favorite })
      .eq('id', id)
      .select()
      .single()
    return assertNoError(data, error, 'RecipesService.toggleFavorite') as Recipe
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.db.from('recipes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
