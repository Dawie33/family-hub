import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeIngredientDto {
  @IsString()
  item: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateRecipeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  servings?: number;

  @IsOptional()
  @IsNumber()
  prep_time?: number;

  @IsOptional()
  @IsNumber()
  cook_time?: number;

  @IsOptional()
  @IsIn(['entree', 'plat', 'dessert', 'gouter', 'autre'])
  category?: 'entree' | 'plat' | 'dessert' | 'gouter' | 'autre';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['chat', 'manual'])
  source?: 'chat' | 'manual';

  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;
}
