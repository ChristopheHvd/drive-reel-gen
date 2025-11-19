-- Ajouter la colonne instagram_url à brand_profiles
ALTER TABLE public.brand_profiles 
ADD COLUMN instagram_url TEXT;

-- Ajouter un commentaire
COMMENT ON COLUMN public.brand_profiles.instagram_url IS 'URL du profil Instagram de l''entreprise';