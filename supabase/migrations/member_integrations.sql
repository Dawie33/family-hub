-- Table pour stocker les tokens d'intégrations tierces par membre
CREATE TABLE IF NOT EXISTS member_integrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID        NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  provider          TEXT        NOT NULL,
  access_token      TEXT,
  token_expires_at  TIMESTAMPTZ,
  provider_email    TEXT,
  status            TEXT        NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, provider)
);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER member_integrations_updated_at
  BEFORE UPDATE ON member_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS : chaque utilisateur ne voit que ses propres intégrations
ALTER TABLE member_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own integrations"
  ON member_integrations FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can upsert own integrations"
  ON member_integrations FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can update own integrations"
  ON member_integrations FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );
