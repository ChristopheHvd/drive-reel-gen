-- Activer REPLICA IDENTITY FULL pour capturer toutes les colonnes lors des mises à jour
ALTER TABLE public.videos REPLICA IDENTITY FULL;

-- Ajouter la table videos à la publication realtime pour recevoir les mises à jour en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;