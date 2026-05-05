'use client';

import { ChevronDown } from 'lucide-react';
import { useFamilyStore } from '@/stores/familyStore';

const MEMBER_COLORS = ['#4784EC', '#6CC8C1', '#FFBB72', '#A78BFA', '#DC2626'];

export default function TopHeader() {
  const family = useFamilyStore((s) => s.family);
  const members = family?.members ?? [];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b flex items-center"
      style={{ borderColor: '#EBEBEB' }}
    >
      <div className="hidden lg:block w-56 flex-shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
        <div className="flex items-center gap-1">
          <span
            className="font-bold text-sm"
            style={{ color: '#32325D', fontFamily: 'Nunito, sans-serif' }}
          >
            {family?.name ?? 'Ma famille'}
          </span>
          <ChevronDown size={14} strokeWidth={2} style={{ color: '#999' }} />
        </div>

        {members.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {members.slice(0, 4).map((m, i) => (
              <div
                key={m.id}
                className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                title={m.name}
              >
                {m.name[0].toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden xl:block w-72 flex-shrink-0" />
    </header>
  );
}
