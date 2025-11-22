import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image, UploadProgress } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

/**
 * Hook pour gérer l'upload d'images vers le storage de l'équipe
 * 
 * @returns Fonction d'upload et état
 */
export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Type de fichier non autorisé: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB > 10MB`;
    }
    return null;
  };

  const uploadImages = useCallback(async (files: File[]): Promise<Image[]> => {
    setIsUploading(true);
    setError(null);
    
    const uploadedImages: Image[] = [];
    const progressArray: UploadProgress[] = files.map(f => ({
      fileName: f.name,
      progress: 0,
      status: 'pending'
    }));
    
    setProgress(progressArray);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Récupérer le team_id de l'utilisateur
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) throw new Error("Équipe non trouvée");

      const teamId = teamMember.team_id;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validation
        const validationError = validateFile(file);
        if (validationError) {
          progressArray[i] = { ...progressArray[i], status: 'error', error: validationError };
          setProgress([...progressArray]);
          continue;
        }

        progressArray[i] = { ...progressArray[i], status: 'uploading', progress: 10 };
        setProgress([...progressArray]);

        // Générer un nom de fichier unique
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const storagePath = `${teamId}/${fileName}`;

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('team-images')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (uploadError) throw uploadError;

        progressArray[i] = { ...progressArray[i], progress: 70 };
        setProgress([...progressArray]);

        // Créer l'entrée dans la table images
        const { data: imageData, error: insertError } = await supabase
          .from('images')
          .insert({
            team_id: teamId,
            uploaded_by: user.id,
            storage_path: storagePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        uploadedImages.push(imageData);
        progressArray[i] = { ...progressArray[i], status: 'success', progress: 100 };
        setProgress([...progressArray]);
      }

      return uploadedImages;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'upload";
      setError(errorMsg);
      console.error('Upload error:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress([]);
    setError(null);
  }, []);

  return {
    uploadImages,
    isUploading,
    progress,
    error,
    resetProgress,
  };
};
