import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { MealPlansService } from './meal-plans.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { SetMealPlanItemDto } from './dto/meal-plan.dto';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly mealPlansService: MealPlansService,
  ) {}

  @Post()
  create(@Body() createRecipeDto: CreateRecipeDto) {
    return this.recipesService.create(createRecipeDto);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('favorite') favorite?: string,
    @Query('search') search?: string,
  ) {
    if (search) return this.recipesService.search(search);
    if (category) return this.recipesService.findByCategory(category);
    if (favorite === 'true') return this.recipesService.findFavorites();
    return this.recipesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRecipeDto: UpdateRecipeDto) {
    return this.recipesService.update(id, updateRecipeDto);
  }

  @Patch(':id/favorite')
  toggleFavorite(@Param('id') id: string) {
    return this.recipesService.toggleFavorite(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recipesService.remove(id);
  }
}

@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Get('current')
  getCurrentWeekPlan() {
    return this.mealPlansService.getCurrentWeekPlan();
  }

  @Get(':weekStart')
  getWeekPlan(@Param('weekStart') weekStart: string) {
    return this.mealPlansService.getOrCreateWeekPlan(weekStart);
  }

  @Post(':weekStart/items')
  setMealPlanItem(@Param('weekStart') weekStart: string, @Body() dto: SetMealPlanItemDto) {
    return this.mealPlansService.setMealPlanItem(weekStart, dto);
  }

  @Delete('items/:itemId')
  removeMealPlanItem(@Param('itemId') itemId: string) {
    return this.mealPlansService.removeMealPlanItem(itemId);
  }

  @Post(':weekStart/shopping-list')
  generateShoppingList(@Param('weekStart') weekStart: string) {
    return this.mealPlansService.generateShoppingList(weekStart);
  }
}
