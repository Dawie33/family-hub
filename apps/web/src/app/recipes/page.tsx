'use client';

import { useEffect, useState } from 'react';
import { getWeeklyMeals, Meal } from '@/lib/recipeAiApi';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const MEAL_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  breakfast: { icon: '🌅', label: 'Petit-déjeuner' },
  lunch:     { icon: '☀️', label: 'Déjeuner' },
  dinner:    { icon: '🌙', label: 'Dîner' },
};

export default function RecipesScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklyMeals()
      .then(setMeals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getMealsByDay = (day: string) => meals.filter((m) => m.day === day);
  const totalCalories = meals.reduce((acc, m) => acc + m.calories, 0);
  const totalPrep = meals.reduce((acc, m) => acc + m.prepTime, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
          Repas de la semaine
        </h1>
        <p className="text-sm mt-1" style={{ color: '#999' }}>Planification alimentaire</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: meals.length, label: 'Repas',         color: '#FFBB72', bg: '#FFF7EE' },
          { value: totalCalories, label: 'Kcal / semaine', color: '#4784EC', bg: '#EFF4FD' },
          { value: totalPrep,    label: 'Min de prep',   color: '#6CC8C1', bg: '#EDF9F8' },
        ].map(({ value, label, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: bg }}>
            <p className="text-2xl font-bold" style={{ color, fontFamily: 'Nunito, sans-serif' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: '#999' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Planning par jour */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map((day) => {
            const dayMeals = getMealsByDay(day);
            const dayCalories = dayMeals.reduce((acc, m) => acc + m.calories, 0);

            return (
              <div key={day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header du jour */}
                <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                  <p className="font-bold text-sm" style={{ color: '#11253E' }}>{day}</p>
                  {dayCalories > 0 && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: '#FFF7EE', color: '#FFBB72' }}>
                      {dayCalories} kcal
                    </span>
                  )}
                </div>

                {dayMeals.length === 0 ? (
                  <p className="px-5 py-4 text-xs" style={{ color: '#ccc' }}>Rien de planifié</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {dayMeals.map((meal) => {
                      const cfg = MEAL_TYPE_CONFIG[meal.type] ?? { icon: '🍽️', label: meal.type };
                      return (
                        <div key={meal.id} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{cfg.icon}</span>
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#32325D' }}>{meal.name}</p>
                              <p className="text-xs" style={{ color: '#999' }}>
                                {cfg.label} • {meal.prepTime} min
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium" style={{ color: '#FFBB72' }}>
                            {meal.calories} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
