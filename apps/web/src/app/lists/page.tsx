'use client';

import { useEffect, useState, useMemo } from 'react';
import { getShoppingLists, getShoppingItems, ShoppingList, ShoppingItem } from '@/lib/recipeAiApi';
import { useFamilyStore } from '@/stores/familyStore';

export default function ListsPage() {
  const family                          = useFamilyStore(s => s.family);
  const fetchFamily                     = useFamilyStore(s => s.fetchFamily);
  const [lists, setLists]               = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [items, setItems]               = useState<ShoppingItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!family) fetchFamily().catch(() => {});
  }, []);

  useEffect(() => {
    getShoppingLists(family?.id)
      .then(data => {
        setLists(data);
        if (data.length > 0) selectList(data[0]);
      })
      .finally(() => setLoadingLists(false));
  }, [family?.id]);

  async function selectList(list: ShoppingList) {
    setSelectedList(list);
    setLoadingItems(true);
    getShoppingItems(list.id).then(setItems).finally(() => setLoadingItems(false));
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const cat = item.unit || 'Autre';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div className="max-w-lg mx-auto px-4 md:px-6 py-8 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Mes listes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#bbb' }}>Courses générées par le coach nutrition</p>
        </div>
        {!loadingItems && items.length > 0 && (
          <span className="text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#EDF9F8', color: '#6CC8C1' }}>
            {checkedCount}/{items.length}
          </span>
        )}
      </div>

      {/* Sélecteur de liste */}
      {!loadingLists && lists.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {lists.map((list, i) => (
            <button
              key={list.id}
              onClick={() => selectList(list)}
              className="text-xs px-3 py-1.5 rounded-full border font-semibold transition-all"
              style={selectedList?.id === list.id
                ? { backgroundColor: '#11253E', color: '#fff', borderColor: '#11253E' }
                : { backgroundColor: '#fff', color: '#585858', borderColor: '#e5e7eb' }}
            >
              {i === 0
                ? 'Cette semaine'
                : new Date(list.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </button>
          ))}
        </div>
      )}

      {/* Contenu */}
      {loadingLists ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p style={{ fontSize: 48 }}>🛒</p>
          <p className="font-semibold" style={{ color: '#11253E' }}>Aucune liste de courses</p>
          <p className="text-sm" style={{ color: '#bbb' }}>
            Demande un menu de la semaine au coach nutrition !
          </p>
        </div>
      ) : loadingItems ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, catItems]) => (
            <div key={category}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#FFBB72' }}>
                {category}
              </p>
              <div className="rounded-2xl overflow-hidden border border-gray-100">
                {catItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{
                      backgroundColor: '#fff',
                      borderBottom: i < catItems.length - 1 ? '1px solid #F7F8FA' : 'none',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                      style={{
                        border: `2px solid ${item.checked ? '#6CC8C1' : '#E5E7EB'}`,
                        backgroundColor: item.checked ? '#6CC8C1' : 'transparent',
                      }}
                    >
                      {item.checked && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: item.checked ? '#bbb' : '#32325D',
                        textDecoration: item.checked ? 'line-through' : 'none',
                      }}
                    >
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-xs" style={{ color: '#bbb' }}>{item.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
