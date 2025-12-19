-- Supprimer l'ancienne contrainte
ALTER TABLE brand_profiles DROP CONSTRAINT IF EXISTS brand_profiles_analysis_status_check;

-- Créer la nouvelle contrainte avec 'todo'
ALTER TABLE brand_profiles ADD CONSTRAINT brand_profiles_analysis_status_check 
CHECK (
  analysis_status IS NULL 
  OR analysis_status = ANY (ARRAY['todo'::text, 'pending'::text, 'completed'::text, 'failed'::text])
);