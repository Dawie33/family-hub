import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class SetMealPlanItemDto {
  @IsNumber()
  day_of_week: number;

  @IsIn(['dejeuner', 'diner'])
  meal_type: 'dejeuner' | 'diner';

  @IsOptional()
  @IsNumber()
  recipe_id?: number;

  @IsOptional()
  @IsString()
  custom_title?: string;
}
