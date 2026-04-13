const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface RecipeNutrition {
  calories: number;
  proteins: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id?: string;
  title: string;
  ingredients: string[];
  steps: string[];
  duration: string;
  difficulty: 'débutant' | 'intermédiaire' | 'chef';
  nutrition?: RecipeNutrition;
  filters?: string[];
  cuisine_type?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

// Ancien type conservé pour compatibilité
export interface Meal {
  id: string;
  name: string;
  day: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  calories: number;
  prepTime: number;
  image?: string;
}

export async function getSavedRecipes(): Promise<Recipe[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/recipe-ai/recipes`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}
