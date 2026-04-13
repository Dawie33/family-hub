export interface RecipeNutrition {
  calories: number;
  proteins: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id?: string;
  title: string;
  ingredients: string[];       // ex: "200g de poulet"
  steps: string[];
  duration: string;            // ex: "30 minutes"
  difficulty: 'débutant' | 'intermédiaire' | 'chef';
  nutrition?: RecipeNutrition;
  filters?: string[];
  cuisine_type?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

export interface ShoppingListCategory {
  category: string;
  items: string[];
}

export interface MealPlanResult {
  recipes: Recipe[];
  shoppingList: ShoppingListCategory[];
}

export interface GenerateRecipeParams {
  ingredients: string[];
  filters?: string[];
  cuisineTypes?: string[];
  platTypes?: string[];
  difficulty?: string;
  maxDuration?: string;
}

export interface GenerateMealPlanParams {
  numberOfMeals: number;
  numberOfPeople: number;
  filters?: string[];
  cuisineTypes?: string[];
  platTypes?: string[];
  difficulty?: string;
  maxDuration?: string;
}
