-- Ajoute la colonne provider_password pour le re-login automatique (Training-Camp)
ALTER TABLE member_integrations
  ADD COLUMN IF NOT EXISTS provider_password TEXT;
