-- Ajouter nouvelles colonnes à la table videos pour supporter les nouvelles fonctionnalités
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS seed INTEGER,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS additional_image_url TEXT,
ADD COLUMN IF NOT EXISTS generation_type TEXT NOT NULL DEFAULT 'FIRST_AND_LAST_FRAMES_2_VIDEO',
ADD COLUMN IF NOT EXISTS was_cropped BOOLEAN DEFAULT FALSE;

-- Ajouter une contrainte sur generation_type
ALTER TABLE public.videos
ADD CONSTRAINT videos_generation_type_check 
CHECK (generation_type IN ('FIRST_AND_LAST_FRAMES_2_VIDEO', 'REFERENCE_2_VIDEO'));