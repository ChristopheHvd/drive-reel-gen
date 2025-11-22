-- RLS Policies pour le bucket team-images (seulement celles qui n'existent pas)

-- Policy pour lecture/téléchargement des images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Team members can download team images'
  ) THEN
    CREATE POLICY "Team members can download team images"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'team-images' 
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy pour suppression des images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Team members can delete team images'
  ) THEN
    CREATE POLICY "Team members can delete team images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'team-images'
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;