-- Remplace la policy SELECT pour autoriser l'accès via member_id OU family_id
-- (couvre le cas où family_id est null)
DROP POLICY IF EXISTS "members can read family email tasks" ON email_tasks;

CREATE POLICY "members can read family email tasks"
  ON email_tasks FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
    OR
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );
