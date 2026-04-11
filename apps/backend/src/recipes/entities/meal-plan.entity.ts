import { Recipe } from './recipe.entity';

export type MealType = 'dejeuner' | 'diner';

export class MealPlan {
  id: number;
  user_id: number | null;
  week_start: string;
  created_at: Date;
  updated_at: Date;
}

export class MealPlanItem {
  id: number;
  meal_plan_id: number;
  recipe_id: number | null;
  day_of_week: number;
  meal_type: MealType;
  custom_title: string | null;
  created_at: Date;
  recipe?: Recipe;
}
