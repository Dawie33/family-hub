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

export interface ShoppingList {
  id: string;
  name: string;
  color: string;
  created_at: string;
  family_id: string | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null; // utilisé comme catégorie
  checked: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function getShoppingLists(familyId?: string): Promise<ShoppingList[]> {
  const url = new URL(`${API_BASE}/shopping/lists`);
  if (familyId) url.searchParams.set('family_id', familyId);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  return res.json();
}

export async function getShoppingItems(listId: string): Promise<ShoppingItem[]> {
  const res = await fetch(`${API_BASE}/shopping/items?list_id=${listId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/recipe-ai/recipes/${id}`, { method: 'DELETE' });
  return res.ok;
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
