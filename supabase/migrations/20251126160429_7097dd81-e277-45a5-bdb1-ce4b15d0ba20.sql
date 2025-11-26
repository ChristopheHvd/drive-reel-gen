-- Ajouter les colonnes pour la gestion des durées de vidéo multi-segments
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS target_duration_seconds INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS current_segment INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS segment_prompts JSONB DEFAULT NULL;

COMMENT ON COLUMN public.videos.target_duration_seconds IS 'Durée cible demandée par l''utilisateur (8, 16, ou 24 secondes)';
COMMENT ON COLUMN public.videos.current_segment IS 'Segment actuel de génération (1=initial, 2=première extension, 3=deuxième extension)';
COMMENT ON COLUMN public.videos.segment_prompts IS 'Tableau JSON des prompts pour chaque segment de 8s ["prompt segment 1", "prompt segment 2", ...]';