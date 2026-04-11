-- Ajoute la colonne refresh_token pour OAuth (Google, etc.)
ALTER TABLE member_integrations
  ADD COLUMN IF NOT EXISTS refresh_token TEXT;
