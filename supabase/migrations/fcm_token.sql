-- Ajout de la colonne fcm_token à family_members
-- Permet de sauvegarder le token Firebase pour les notifications push

alter table family_members
  add column if not exists fcm_token text;
