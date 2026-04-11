const RECIPE_AI_API = process.env.NEXT_PUBLIC_RECIPE_AI_API || 'https://recipe-ai.example.com/api';

export interface Meal {
  id: string;
  name: string;
  day: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  calories: number;
  prepTime: number;
  image?: string;
}

export async function getWeeklyMeals(): Promise<Meal[]> {
  try {
    const response = await fetch(`${RECIPE_AI_API}/meals/weekly`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return getMockMeals();
    }
    
    return response.json();
  } catch {
    return getMockMeals();
  }
}

function getMockMeals(): Meal[] {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const meals: Meal[] = [];
  
  days.forEach((day, dayIndex) => {
    meals.push({
      id: `${dayIndex}-breakfast`,
      name: 'Petit-déjeuner',
      day,
      type: 'breakfast',
      calories: 350,
      prepTime: 10,
    });
    meals.push({
      id: `${dayIndex}-lunch`,
      name: 'Déjeuner',
      day,
      type: 'lunch',
      calories: 600,
      prepTime: 20,
    });
    meals.push({
      id: `${dayIndex}-dinner`,
      name: 'Dîner',
      day,
      type: 'dinner',
      calories: 550,
      prepTime: 30,
    });
  });
  
  return meals;
}
