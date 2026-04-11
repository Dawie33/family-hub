# AGENTS.md - Family Hub Development Guide

This repository contains two main projects:
- `family-hub-app/` - Expo/React Native mobile app (expo-router based)
- `family-hub-web/` - Next.js 16 web app (App Router)

## Build Commands

### family-hub-app (Expo)
```bash
cd family-hub-app

# Start dev server
npm start              # or: npx expo start
npx expo start -c      # clear cache before starting

# Run on platform
npx expo run:android   # Android
npx expo run:ios       # iOS (requires macOS)
npx expo start --web   # Web

# Lint & TypeCheck
npm run lint           # ESLint
npm run typecheck      # TypeScript check (tsc --noEmit)
```

### family-hub-web (Next.js)
```bash
cd family-hub-web

# Dev server (runs on port 3002)
npm run dev            # or: next dev -p 3002

# Build & Start
npm run build          # Production build
npm run start          # Start production server
npm run lint           # ESLint with Next.js config
```

## Code Style Guidelines

### TypeScript Conventions

**Types over interfaces for simple types:**
```typescript
// Prefer type for unions/interfaces
type EventCategory = 'school' | 'vacation' | 'birthday';

// Use interface for object shapes with methods
interface FamilyEvent {
  id: string;
  title: string;
  // ...
}
```

**Explicit return types for functions:**
```typescript
function formatDate(date: string): string {
  return format(new Date(date), 'yyyy-MM-dd');
}
```

**Use `unknown` for catch blocks, then narrow:**
```typescript
try {
  // ...
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

### Naming Conventions

- **Files**: kebab-case (`familyStore.ts`, `recipeAiApi.ts`)
- **Components**: PascalCase (`HomeScreen.tsx`, `Navigation.tsx`)
- **Types/Interfaces**: PascalCase (`FamilyMember`, `EventCategory`)
- **Variables/functions**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for config values

### Imports

**Order (family-hub-app):**
1. React/Expo imports
2. Third-party libraries
3. Internal services/stores
4. Types
5. Relative imports

```typescript
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { useFamilyStore } from '@/store/familyStore';
import type { FamilyMember } from '@/types';
import { supabase } from '../services/supabase';
```

### Error Handling

**Use Result pattern or error messages:**
```typescript
// Service layer
export async function getFamilyEvents(): Promise<FamilyEvent[]> {
  const { data, error } = await supabase
    .from('family_events')
    .select('*');
  
  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }
  
  return data || [];
}

// API response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
```

### React/Expo Patterns

**Custom hooks for business logic:**
```typescript
// useFamily.ts
export function useFamily() {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadFamily();
  }, []);
  
  return { family, loading };
}
```

**Zustand stores (family-hub-app pattern):**
```typescript
import { create } from 'zustand';

interface FamilyStore {
  members: FamilyMember[];
  addMember: (member: FamilyMember) => void;
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  members: [],
  addMember: (member) => set((state) => ({ 
    members: [...state.members, member] 
  })),
}));
```

### State Management

- **family-hub-app**: Zustand v4 for global state
- **family-hub-web**: Zustand v5 for global state
- Use React Query/TanStack Query for server state if needed

### Styling

**family-hub-app**: Native styling (no info found - check component files)

**family-hub-web**: Tailwind CSS v4 with @tailwindcss/postcss
```typescript
// Uses CSS-based config (no tailwind.config.js)
// Utility classes only, custom styles in globals.css
```

### Environment Variables

**family-hub-app**: Prefix with `EXPO_PUBLIC_`
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

**family-hub-web**: Standard Next.js
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Database

Uses Supabase. Schema in `supabase/schema.sql`.

Key tables:
- `families`
- `family_members`
- `family_events`
- `integrations`

## Important Notes

- This is NOT the Next.js you know. Next.js 16 has breaking changes - read docs before writing code.
- The mobile app uses expo-router for file-based routing
- Both apps share similar business logic but have separate implementations
- Check `integration-guides/` for external API integrations
