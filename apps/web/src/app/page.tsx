'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFamilyStore } from '@/stores/familyStore';
import { getTrainingSessions, TrainingSession } from '@/lib/trainingCampApi';
import { getSavedRecipes, Recipe } from '@/lib/recipeAiApi';

const MODULE_CARDS = [
  {
    href: '/agent',
    icon: '💬',
    label: 'Assistant IA',
    description: 'Planifiez, organisez, posez vos questions',
    color: '#4784EC',
    bg: '#EFF4FD',
  },
  {
    href: '/training',
    icon: '💪',
    label: 'Sport',
    description: 'Séances, programmes et suivi activité',
    color: '#6CC8C1',
    bg: '#EDF9F8',
  },
  {
    href: '/recipes',
    icon: '🍽️',
    label: 'Repas',
    description: 'Planification des repas de la semaine',
    color: '#FFBB72',
    bg: '#FFF7EE',
  },
  {
    href: '/settings',
    icon: '👨‍👩‍👧‍👦',
    label: 'Famille',
    description: 'Membres, rôles et préférences',
    color: '#A78BFA',
    bg: '#F5F3FF',
  },
];

export default function HomeScreen() {
  const family = useFamilyStore((s) => s.family);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [meals, setMeals] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionsData, mealsData] = await Promise.all([
          getTrainingSessions(),
          getSavedRecipes(),
        ]);
        setSessions(sessionsData.slice(0, 3));
        setMeals(mealsData.slice(0, 3));
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">

      {/* Hero banner */}
      <div
        className="rounded-2xl px-6 py-8 md:py-10 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4784EC 0%, #32325D 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-75 capitalize">{today}</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-white">
            Bonjour, {family?.name || 'Famille'} !
          </h1>
          <p className="mt-2 opacity-80 text-sm md:text-base">
            Retrouvez ici le résumé de votre semaine familiale.
          </p>
        </div>
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: '#FFE100' }}
        />
        <div
          className="absolute -bottom-6 right-16 w-24 h-24 rounded-full opacity-10"
          style={{ backgroundColor: '#6CC8C1' }}
        />
      </div>

      {/* Module cards grid */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: '#11253E' }}>
          Modules
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MODULE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl p-4 transition-transform hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: card.bg }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: card.color + '22' }}
              >
                {card.icon}
              </div>
              <p className="font-bold text-sm" style={{ color: card.color }}>
                {card.label}
              </p>
              <p className="text-xs mt-1" style={{ color: '#999999' }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-column section: Sport + Repas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Prochaines séances */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ backgroundColor: '#EDF9F8', color: '#6CC8C1' }}
              >
                💪
              </span>
              <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>
                Prochaines séances
              </h2>
            </div>
            <Link
              href="/training"
              className="text-xs font-semibold"
              style={{ color: '#4784EC' }}
            >
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#999' }}>
              Aucune séance planifiée
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: '#F7F8FA' }}
                >
                  <span className="text-sm font-medium" style={{ color: '#32325D' }}>
                    {session.name}
                  </span>
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        session.intensity === 'high' ? '#FEE2E2' :
                        session.intensity === 'medium' ? '#FEF9C3' : '#DCFCE7',
                      color:
                        session.intensity === 'high' ? '#DC2626' :
                        session.intensity === 'medium' ? '#CA8A04' : '#16A34A',
                    }}
                  >
                    {session.intensity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Repas de la semaine */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ backgroundColor: '#FFF7EE', color: '#FFBB72' }}
              >
                🍽️
              </span>
              <h2 className="font-bold text-sm" style={{ color: '#11253E' }}>
                Repas de la semaine
              </h2>
            </div>
            <Link
              href="/recipes"
              className="text-xs font-semibold"
              style={{ color: '#4784EC' }}
            >
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : meals.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#999' }}>
              Aucune recette sauvegardée
            </p>
          ) : (
            <div className="space-y-2">
              {meals.map((recipe, i) => (
                <div
                  key={recipe.id ?? i}
                  className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: '#F7F8FA' }}
                >
                  <span className="text-sm font-medium" style={{ color: '#32325D' }}>
                    {recipe.title}
                  </span>
                  <span className="text-xs font-medium" style={{ color: '#999' }}>
                    {recipe.duration}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Membres de la famille */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-sm mb-4" style={{ color: '#11253E' }}>
          Membres de la famille
        </h2>
        <div className="flex flex-wrap gap-3">
          {family?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-full border border-gray-100"
              style={{ backgroundColor: '#F7F8FA' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: '#4784EC' }}
              >
                {member.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight" style={{ color: '#32325D' }}>
                  {member.name}
                </p>
                <p className="text-xs leading-tight" style={{ color: '#999' }}>
                  {member.role === 'parent' ? 'Parent' : 'Enfant'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
