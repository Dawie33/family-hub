'use client';

import { useEffect, useState, useMemo } from 'react';
import { getSavedRecipes, deleteRecipe, Recipe } from '@/lib/recipeAiApi';

// ─── Config ───────────────────────────────────────────────────────────────────

const DIFF: Record<string, { label: string; color: string; bg: string }> = {
  'débutant':      { label: 'Débutant',      color: '#6CC8C1', bg: '#EDF9F8' },
  'intermédiaire': { label: 'Intermédiaire', color: '#FFBB72', bg: '#FFF7EE' },
  'chef':          { label: 'Chef',          color: '#4784EC', bg: '#EFF4FD' },
};

type SortKey = 'date' | 'title' | 'duration' | 'difficulty';
type ViewMode = 'menu' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDurationMinutes(d: string): number {
  const h = d.match(/(\d+)\s*h/i);
  const m = d.match(/(\d+)\s*min/i);
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function groupByDay(recipes: Recipe[]): { key: string; label: string; recipes: Recipe[] }[] {
  const map = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const key = r.created_at ? new Date(r.created_at).toDateString() : 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, recs]) => ({
      key,
      label: key === 'unknown' ? 'Date inconnue' : formatDay(recs[0].created_at!),
      recipes: recs,
    }));
}

// ─── Modale ───────────────────────────────────────────────────────────────────

function RecipeModal({ recipe, onClose, onDelete }: { recipe: Recipe; onClose: () => void; onDelete: (id: string) => void }) {
  const diff = DIFF[recipe.difficulty] ?? { label: recipe.difficulty, color: '#999', bg: '#F5F5F5' };
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm]   = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleDelete() {
    if (!recipe.id) return;
    setDeleting(true);
    const ok = await deleteRecipe(recipe.id);
    if (ok) { onDelete(recipe.id); onClose(); }
    else setDeleting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl"
        style={{ backgroundColor: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E0E0E0' }} />
        </div>

        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: diff.bg }}>
              🍽️
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-snug" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
                {recipe.title}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#aaa' }}>
                ⏱ {recipe.duration} &nbsp;•&nbsp; 🥕 {recipe.ingredients.length} ingr.
              </p>
              <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ color: diff.color, backgroundColor: diff.bg }}>
                {diff.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
            style={{ color: '#aaa' }}>
            ✕
          </button>
        </div>

        <div className="h-px mx-6" style={{ backgroundColor: '#F0F0F0' }} />

        <div className="px-6 py-5 space-y-6">
          {recipe.nutrition && (
            <div className="grid grid-cols-4 gap-2 rounded-2xl p-4" style={{ backgroundColor: '#F9FAFB' }}>
              {[
                { label: 'Kcal',      value: recipe.nutrition.calories },
                { label: 'Protéines', value: `${recipe.nutrition.proteins}g` },
                { label: 'Glucides',  value: `${recipe.nutrition.carbs}g` },
                { label: 'Lipides',   value: `${recipe.nutrition.fat}g` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="font-bold text-sm" style={{ color: '#11253E' }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#999' }}>{label}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#FFBB72' }}>Ingrédients</p>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#32325D' }}>
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: '#FFBB72' }} />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4784EC' }}>Préparation</p>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm" style={{ color: '#32325D' }}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold mt-0.5"
                    style={{ backgroundColor: '#EFF4FD', color: '#4784EC' }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Suppression */}
          {recipe.id && (
            <div className="pt-2 border-t border-gray-100">
              {!confirm ? (
                <button
                  onClick={() => setConfirm(true)}
                  className="text-sm font-semibold transition-colors hover:opacity-70"
                  style={{ color: '#FF6B6B' }}
                >
                  Supprimer cette recette
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: '#32325D' }}>Confirmer la suppression ?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-sm font-bold px-3 py-1.5 rounded-xl transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#FF6B6B', color: '#fff' }}
                  >
                    {deleting ? '...' : 'Supprimer'}
                  </button>
                  <button
                    onClick={() => setConfirm(false)}
                    className="text-sm" style={{ color: '#999' }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card recette (grille desktop) ───────────────────────────────────────────

function RecipeCard({
  recipe,
  onSelect,
  selectionMode,
  checked,
  onToggle,
}: {
  recipe: Recipe;
  onSelect: () => void;
  selectionMode: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const diff = DIFF[recipe.difficulty] ?? { label: recipe.difficulty, color: '#999', bg: '#F5F5F5' };

  return (
    <div
      onClick={selectionMode ? onToggle : onSelect}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
      style={{
        backgroundColor: checked ? '#EFF4FD' : '#fff',
        border: `1px solid ${checked ? '#4784EC' : '#F0F0F0'}`,
      }}
    >
      {/* Checkbox */}
      {selectionMode && (
        <div
          className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all"
          style={{
            border: `2px solid ${checked ? '#4784EC' : '#D0D0D0'}`,
            backgroundColor: checked ? '#4784EC' : 'transparent',
          }}
        >
          {checked && <span className="text-white text-xs font-bold">✓</span>}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug truncate" style={{ color: '#11253E' }}>
          {recipe.title}
        </p>
        <p className="text-xs mt-1.5" style={{ color: '#aaa' }}>
          ⏱ {recipe.duration} &nbsp;•&nbsp; 🥕 {recipe.ingredients.length} ingr.
        </p>
      </div>
      <span
        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ color: diff.color, backgroundColor: diff.bg }}
      >
        {diff.label}
      </span>
    </div>
  );
}

// ─── Grille recettes ─────────────────────────────────────────────────────────

function RecipeGrid({
  recipes,
  onSelect,
  selectionMode,
  selectedIds,
  onToggle,
}: {
  recipes: Recipe[];
  onSelect: (r: Recipe) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (recipes.length === 0) {
    return <p className="text-center py-6 text-sm" style={{ color: '#bbb' }}>Aucune recette</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {recipes.map((r, i) => (
        <RecipeCard
          key={r.id ?? i}
          recipe={r}
          onSelect={() => onSelect(r)}
          selectionMode={selectionMode}
          checked={!!r.id && selectedIds.has(r.id)}
          onToggle={() => r.id && onToggle(r.id)}
        />
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="rounded-2xl p-4 animate-pulse flex items-center gap-4"
          style={{ backgroundColor: '#fff', border: '1px solid #F0F0F0' }}>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Séparateur de groupe ─────────────────────────────────────────────────────

function GroupDivider({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ backgroundColor: '#F0F0F0' }} />
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize"
        style={isFirst
          ? { backgroundColor: '#EFF4FD', color: '#4784EC' }
          : { backgroundColor: '#F7F8FA', color: '#bbb' }}>
        {isFirst && <span>Cette semaine •</span>}
        {label}
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: '#F0F0F0' }} />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [recipes, setRecipes]         = useState<Recipe[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Recipe | null>(null);
  const [view, setView]               = useState<ViewMode>('menu');
  const [sort, setSort]               = useState<SortKey>('date');
  const [diffFilter, setDiffFilter]   = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting]       = useState(false);

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    await Promise.allSettled([...selectedIds].map(id => deleteRecipe(id)));
    setRecipes(prev => prev.filter(r => !r.id || !selectedIds.has(r.id)));
    exitSelectionMode();
    setDeleting(false);
  }

  useEffect(() => {
    getSavedRecipes().then(setRecipes).finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupByDay(recipes), [recipes]);

  const sortedFiltered = useMemo(() => {
    let list = diffFilter ? recipes.filter(r => r.difficulty === diffFilter) : [...recipes];
    switch (sort) {
      case 'title':    list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'duration': list.sort((a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration)); break;
      case 'difficulty': {
        const order = ['débutant', 'intermédiaire', 'chef'];
        list.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
        break;
      }
      default: list.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    }
    return list;
  }, [recipes, sort, diffFilter]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Mes recettes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#bbb' }}>Coach nutrition</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && recipes.length > 0 && (
            selectionMode ? (
              <button
                onClick={exitSelectionMode}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={{ color: '#999', borderColor: '#e5e7eb' }}
              >
                Annuler
              </button>
            ) : (
              <button
                onClick={() => setSelectionMode(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={{ color: '#585858', borderColor: '#e5e7eb', backgroundColor: '#fff' }}
              >
                Sélectionner
              </button>
            )
          )}
          {!loading && !selectionMode && (
            <span className="text-sm font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#EDF9F8', color: '#6CC8C1' }}>
              {recipes.length}
            </span>
          )}
        </div>
      </div>

      {/* Barre de suppression groupée */}
      {selectionMode && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{ backgroundColor: selectedIds.size > 0 ? '#FFF0F0' : '#F7F8FA' }}>
          <span className="text-sm font-semibold" style={{ color: selectedIds.size > 0 ? '#FF6B6B' : '#bbb' }}>
            {selectedIds.size === 0
              ? 'Sélectionne des recettes'
              : `${selectedIds.size} recette${selectedIds.size > 1 ? 's' : ''} sélectionnée${selectedIds.size > 1 ? 's' : ''}`}
          </span>
          <button
            onClick={deleteSelected}
            disabled={selectedIds.size === 0 || deleting}
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-30"
            style={{ backgroundColor: '#FF6B6B', color: '#fff' }}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      )}

      {/* Toggle vue */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F7F8FA' }}>
        {([
          { v: 'menu', label: '📅 Par menu' },
          { v: 'all',  label: '📋 Toutes' },
        ] as { v: ViewMode; label: string }[]).map(({ v, label }) => (
          <button key={v} onClick={() => setView(v)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={view === v
              ? { backgroundColor: '#fff', color: '#11253E', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: '#bbb' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtres — vue Toutes uniquement */}
      {view === 'all' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: '#bbb' }}>Trier :</span>
          {([
            { key: 'date' as SortKey,       label: 'Récent' },
            { key: 'title' as SortKey,      label: 'A → Z' },
            { key: 'duration' as SortKey,   label: 'Durée' },
            { key: 'difficulty' as SortKey, label: 'Niveau' },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setSort(key)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={sort === key
                ? { backgroundColor: '#4784EC', color: '#fff', borderColor: '#4784EC' }
                : { backgroundColor: '#fff', color: '#585858', borderColor: '#e5e7eb' }}>
              {label}
            </button>
          ))}
          <div className="w-px h-4 mx-1" style={{ backgroundColor: '#E5E7EB' }} />
          <span className="text-xs font-semibold" style={{ color: '#bbb' }}>Niveau :</span>
          <button onClick={() => setDiffFilter('')}
            className="text-xs px-3 py-1.5 rounded-full border transition-all"
            style={!diffFilter
              ? { backgroundColor: '#11253E', color: '#fff', borderColor: '#11253E' }
              : { backgroundColor: '#fff', color: '#585858', borderColor: '#e5e7eb' }}>
            Tous
          </button>
          {Object.entries(DIFF).map(([key, cfg]) => (
            <button key={key} onClick={() => setDiffFilter(diffFilter === key ? '' : key)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={diffFilter === key
                ? { backgroundColor: cfg.color, color: '#fff', borderColor: cfg.color }
                : { backgroundColor: '#fff', color: '#585858', borderColor: '#e5e7eb' }}>
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenu recettes */}
      {loading ? (
        <SkeletonGrid />
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p style={{ fontSize: 48 }}>🍽️</p>
          <p className="font-semibold" style={{ color: '#11253E' }}>Aucune recette sauvegardée</p>
          <p className="text-sm" style={{ color: '#bbb' }}>Demande un menu de la semaine au coach nutrition !</p>
        </div>
      ) : view === 'all' ? (
        <RecipeGrid
          recipes={sortedFiltered}
          onSelect={selectionMode ? () => {} : setSelected}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggle={toggleId}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group, gi) => (
            <div key={group.key} className="space-y-3">
              <GroupDivider label={group.label} isFirst={gi === 0} />
              <RecipeGrid
                recipes={group.recipes}
                onSelect={selectionMode ? () => {} : setSelected}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggle={toggleId}
              />
            </div>
          ))}
        </div>
      )}

      {selected && !selectionMode && (
        <RecipeModal
          recipe={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => setRecipes(prev => prev.filter(r => r.id !== id))}
        />
      )}
    </div>
  );
}
