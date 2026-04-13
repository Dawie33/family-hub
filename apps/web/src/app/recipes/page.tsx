'use client';

import { useEffect, useState } from 'react';
import { getSavedRecipes, Recipe } from '@/lib/recipeAiApi';

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'débutant':      { label: 'Débutant',      color: '#6CC8C1', bg: '#EDF9F8' },
  'intermédiaire': { label: 'Intermédiaire', color: '#FFBB72', bg: '#FFF7EE' },
  'chef':          { label: 'Chef',          color: '#4784EC', bg: '#EFF4FD' },
};

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [expanded, setExpanded] = useState(false);
  const diff = DIFFICULTY_CONFIG[recipe.difficulty] ?? { label: recipe.difficulty, color: '#999', bg: '#F5F5F5' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            {recipe.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Durée */}
            <span className="text-xs flex items-center gap-1" style={{ color: '#999' }}>
              <span>⏱</span> {recipe.duration}
            </span>
            {/* Ingrédients */}
            <span className="text-xs flex items-center gap-1" style={{ color: '#999' }}>
              <span>🥕</span> {recipe.ingredients.length} ingr.
            </span>
            {/* Difficulté */}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: diff.color, backgroundColor: diff.bg }}
            >
              {diff.label}
            </span>
          </div>
        </div>
        <span className="text-gray-400 mt-0.5 flex-shrink-0" style={{ fontSize: 18 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Contenu déroulant */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
          {/* Ingrédients */}
          <div className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#FFBB72' }}>
              Ingrédients
            </p>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#32325D' }}>
                  <span style={{ color: '#FFBB72' }}>•</span> {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Étapes */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#4784EC' }}>
              Préparation
            </p>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-sm flex gap-3" style={{ color: '#32325D' }}>
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: '#EFF4FD', color: '#4784EC' }}
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Nutrition si disponible */}
          {recipe.nutrition && (
            <div className="rounded-xl p-3 grid grid-cols-4 gap-2" style={{ backgroundColor: '#F9FAFB' }}>
              {[
                { label: 'Kcal',      value: recipe.nutrition.calories },
                { label: 'Protéines', value: `${recipe.nutrition.proteins}g` },
                { label: 'Glucides',  value: `${recipe.nutrition.carbs}g` },
                { label: 'Lipides',   value: `${recipe.nutrition.fat}g` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-sm font-bold" style={{ color: '#11253E' }}>{value}</p>
                  <p className="text-xs" style={{ color: '#999' }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
      <div className="flex gap-2">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSavedRecipes()
      .then(setRecipes)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Mes recettes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#999' }}>
            Sauvegardées depuis le coach nutrition
          </p>
        </div>
        {!loading && (
          <span
            className="text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#EDF9F8', color: '#6CC8C1' }}
          >
            {recipes.length} recette{recipes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p style={{ fontSize: 48 }}>🍽️</p>
          <p className="font-semibold" style={{ color: '#11253E' }}>Aucune recette sauvegardée</p>
          <p className="text-sm" style={{ color: '#999' }}>
            Demande une recette au coach nutrition et dis-lui de la sauvegarder !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe, i) => (
            <RecipeCard key={recipe.id ?? i} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
