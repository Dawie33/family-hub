import { Controller, Delete, Get, Param } from '@nestjs/common'
import { RecipeAiClient } from './recipe-ai.service'
import { Recipe } from './recipe-ai.types'

@Controller('recipe-ai')
export class RecipeAiController {
  constructor(private readonly recipeAiClient: RecipeAiClient) {}

  @Get('recipes')
  async getSavedRecipes(): Promise<Recipe[]> {
    return this.recipeAiClient.getSavedRecipes()
  }

  @Delete('recipes/:id')
  async deleteRecipe(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.recipeAiClient.deleteRecipe(id)
  }
}
