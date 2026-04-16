-- Table pour les tâches et notes créées automatiquement depuis les emails
CREATE TABLE IF NOT EXISTS email_tasks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID        NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  family_id         UUID        REFERENCES families(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN ('task', 'note')),
  title             TEXT        NOT NULL,
  content           TEXT,
  source_email_id   TEXT        NOT NULL,  -- ID du message Gmail (évite les doublons)
  source_subject    TEXT,
  source_from       TEXT,
  done              BOOLEAN     NOT NULL DEFAULT false,  -- uniquement pour les tasks
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_email_id)
);

-- RLS : chaque membre voit les tâches de sa famille
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read family email tasks"
  ON email_tasks FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can insert own email tasks"
  ON email_tasks FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can update own email tasks"
  ON email_tasks FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can delete own email tasks"
  ON email_tasks FOR DELETE
  USING (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Colonne pour tracker le dernier email Gmail traité (par membre/intégration)
ALTER TABLE member_integrations
  ADD COLUMN IF NOT EXISTS gmail_last_check TIMESTAMPTZ;
