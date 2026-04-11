import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { MealPlansService } from './meal-plans.service';
import { RecipesController, MealPlansController } from './recipes.controller';

@Module({
  controllers: [RecipesController, MealPlansController],
  providers: [RecipesService, MealPlansService],
  exports: [RecipesService, MealPlansService],
})
export class RecipesModule {}
