export type RecipeCategory = 'entree' | 'plat' | 'dessert' | 'gouter' | 'autre';

export interface RecipeIngredient {
  item: string;
  quantity?: string;
  category?: string;
}

export class Recipe {
  id: number;
  user_id: number | null;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  instructions: string | null;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  category: RecipeCategory | null;
  tags: string[];
  source: 'chat' | 'manual';
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}
