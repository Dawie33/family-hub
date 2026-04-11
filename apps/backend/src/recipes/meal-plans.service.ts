import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { PdfService } from '../pdf/pdf.service'
import { NotificationsService } from '../notifications/notifications.service'
import { SetMealPlanItemDto } from './dto/meal-plan.dto'
import { MealPlan, MealPlanItem } from './entities/meal-plan.entity'
import { RecipeIngredient } from './entities/recipe.entity'
import { ShoppingItem } from '../pdf/dto/shopping-list.dto'

@Injectable()
export class MealPlansService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly pdfService: PdfService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOrCreateWeekPlan(weekStart: string, userId?: string): Promise<MealPlan & { items: MealPlanItem[] }> {
    let query = this.supabase.db
      .from('meal_plans')
      .select('*')
      .eq('week_start', weekStart)

    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.is('user_id', null)
    }

    let { data: plan } = await query.maybeSingle()

    if (!plan) {
      const { data: created, error } = await this.supabase.db
        .from('meal_plans')
        .insert({ week_start: weekStart, user_id: userId || null })
        .select()
        .single()
      if (error) throw new Error(error.message)
      plan = created
    }

    // Récupérer les items avec les infos de recette
    const { data: items, error: itemsError } = await this.supabase.db
      .from('meal_plan_items')
      .select(`
        *,
        recipe:recipes(id, title, category, prep_time, cook_time, ingredients)
      `)
      .eq('meal_plan_id', (plan as any).id)
      .order('day_of_week', { ascending: true })

    if (itemsError) throw new Error(itemsError.message)

    return { ...(plan as any), items: items ?? [] }
  }

  async getCurrentWeekPlan(userId?: string): Promise<MealPlan & { items: MealPlanItem[] }> {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    const weekStart = monday.toISOString().split('T')[0]
    return this.getOrCreateWeekPlan(weekStart, userId)
  }

  async setMealPlanItem(weekStart: string, dto: SetMealPlanItemDto, userId?: string): Promise<MealPlanItem> {
    const plan = await this.getOrCreateWeekPlan(weekStart, userId)

    const { data: existing } = await this.supabase.db
      .from('meal_plan_items')
      .select('*')
      .eq('meal_plan_id', (plan as any).id)
      .eq('day_of_week', dto.day_of_week)
      .eq('meal_type', dto.meal_type)
      .maybeSingle()

    if (existing) {
      const { data, error } = await this.supabase.db
        .from('meal_plan_items')
        .update({ recipe_id: dto.recipe_id || null, custom_title: dto.custom_title || null })
        .eq('id', (existing as any).id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as MealPlanItem
    }

    const { data, error } = await this.supabase.db
      .from('meal_plan_items')
      .insert({
        meal_plan_id: (plan as any).id,
        recipe_id: dto.recipe_id || null,
        day_of_week: dto.day_of_week,
        meal_type: dto.meal_type,
        custom_title: dto.custom_title || null,
      })
      .select()
      .single()
    return assertNoError(data, error, 'MealPlansService.setMealPlanItem') as MealPlanItem
  }

  async removeMealPlanItem(itemId: string): Promise<void> {
    const { error, count } = await this.supabase.db
      .from('meal_plan_items')
      .delete()
      .eq('id', itemId)
    if (error) throw new Error(error.message)
    if (!count) throw new NotFoundException(`Meal plan item #${itemId} not found`)
  }

  async generateShoppingList(weekStart: string, userId?: string): Promise<{ items: ShoppingItem[]; pdfUrl?: string }> {
    const plan = await this.getOrCreateWeekPlan(weekStart, userId)

    const recipeIds = plan.items
      .filter((item: MealPlanItem) => item.recipe_id)
      .map((item: MealPlanItem) => item.recipe_id)

    if (recipeIds.length === 0) return { items: [] }

    const { data: recipes, error } = await this.supabase.db
      .from('recipes')
      .select('*')
      .in('id', recipeIds)
    if (error) throw new Error(error.message)

    const ingredientMap = new Map<string, ShoppingItem>()

    for (const recipe of recipes ?? []) {
      const ingredients: RecipeIngredient[] = recipe.ingredients ?? []
      for (const ing of ingredients) {
        const key = ing.item.toLowerCase().trim()
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          if (ing.quantity && existing.quantity) {
            existing.quantity += ` + ${ing.quantity}`
          }
        } else {
          ingredientMap.set(key, { item: ing.item, quantity: ing.quantity, category: ing.category })
        }
      }
    }

    const items = Array.from(ingredientMap.values())
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    const summaryParts: string[] = []
    for (const item of plan.items) {
      const title = (item as any).recipe?.title || item.custom_title
      if (title) summaryParts.push(`${days[item.day_of_week]} ${item.meal_type}: ${title}`)
    }
    const summary = `Semaine du ${weekStart} - ${summaryParts.join(', ')}`

    const pdfResult = await this.pdfService.generateShoppingListPdf(items, summary)
    await this.notificationsService.createShoppingListNotification(pdfResult.url, summary)

    return { items, pdfUrl: pdfResult.url }
  }
}
