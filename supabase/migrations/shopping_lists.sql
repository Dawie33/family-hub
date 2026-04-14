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
