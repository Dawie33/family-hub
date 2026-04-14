import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envPath = 'c:/devPerso/family-hub/.env'
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  const k = t.slice(0, eq).trim()
  const v = t.slice(eq + 1).trim()
  if (!process.env[k]) process.env[k] = v
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sql = `
CREATE TABLE IF NOT EXISTS shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID REFERENCES families(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]',
  meal_summary TEXT,
  pdf_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shopping_lists_family_id_idx ON shopping_lists(family_id);
CREATE INDEX IF NOT EXISTS shopping_lists_created_at_idx ON shopping_lists(created_at DESC);
`

const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'rpc not available' } }))

if (error) {
  // Fallback: essai direct
  console.log('Migration via SQL directe...')
  const { error: e2 } = await supabase.from('shopping_lists').select('id').limit(1)
  if (e2?.code === '42P01') {
    console.error('❌ Table shopping_lists inexistante. Lance le SQL dans le dashboard Supabase :')
    console.log(sql)
    process.exit(1)
  } else {
    console.log('✅ Table shopping_lists déjà présente')
    process.exit(0)
  }
}

console.log('✅ Table shopping_lists créée')
