import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import {
  Recipe,
  MealPlanResult,
  GenerateRecipeParams,
  GenerateMealPlanParams,
} from './recipe-ai.types'

@Injectable()
export class RecipeAiClient implements OnModuleInit {
  private readonly logger = new Logger(RecipeAiClient.name)
  private client: AxiosInstance
  readonly isConfigured: boolean

  constructor(private config: ConfigService) {
    const baseURL = this.config.get<string>('RECIPE_AI_URL', 'http://localhost:3003')
    this.isConfigured = !!baseURL

    this.client = axios.create({
      baseURL,
      timeout: 60000, // 60s — la génération OpenAI peut être longue
      headers: { 'Content-Type': 'application/json' },
    })
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn('Recipe AI non configuré (RECIPE_AI_URL manquant)')
      return
    }
    try {
      await this.client.get('/api/recipes')
      this.logger.log(`Recipe AI connecté sur ${this.config.get('RECIPE_AI_URL', 'http://localhost:3003')}`)
    } catch {
      this.logger.warn('Recipe AI inaccessible au démarrage (sera réessayé à la demande)')
    }
  }

  /**
   * Génère une recette depuis une liste d'ingrédients
   */
  async generateRecipe(params: GenerateRecipeParams): Promise<Recipe> {
    const { data } = await this.client.post<Recipe>('/api/generate', {
      ingredients: params.ingredients,
      filters: params.filters ?? [],
      cuisineTypes: params.cuisineTypes,
      platTypes: params.platTypes,
      difficulty: params.difficulty,
      maxDuration: params.maxDuration,
    })
    return data
  }

  /**
   * Génère un planning de repas + liste de courses consolidée
   */
  async generateMealPlan(params: GenerateMealPlanParams): Promise<MealPlanResult> {
    const { data } = await this.client.post<MealPlanResult>('/api/shopping-list', {
      numberOfMeals: params.numberOfMeals,
      numberOfPeople: params.numberOfPeople,
      filters: params.filters ?? [],
      cuisineTypes: params.cuisineTypes,
      platTypes: params.platTypes,
      difficulty: params.difficulty,
      maxDuration: params.maxDuration,
    })
    return data
  }

  /**
   * Récupère toutes les recettes sauvegardées
   */
  async getSavedRecipes(): Promise<Recipe[]> {
    const { data } = await this.client.get<Recipe[]>('/api/recipes')
    return data
  }

  /**
   * Sauvegarde une recette dans Recipe AI
   */
  async deleteRecipe(id: string): Promise<{ success: boolean }> {
    const { data } = await this.client.delete<{ success: boolean }>(`/api/recipes?id=${id}`)
    return data
  }

  async saveRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<{ success: boolean }> {
    const { data } = await this.client.post<{ success: boolean }>('/api/recipes', {
      ...recipe,
      id: randomUUID(),
    })
    return data
  }

  /**
   * Formate une liste de courses pour affichage lisible
   */
  formatShoppingList(shoppingList: MealPlanResult['shoppingList']): string {
    return shoppingList
      .map(cat => `**${cat.category}**\n${cat.items.map(i => `• ${i}`).join('\n')}`)
      .join('\n\n')
  }

  /**
   * Formate un résumé compact du planning repas
   */
  formatMealPlanSummary(result: MealPlanResult): string {
    const titles = result.recipes.map((r, i) => `Repas ${i + 1}: ${r.title}`).join(', ')
    return titles
  }
}
