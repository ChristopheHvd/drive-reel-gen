import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image } from "../types";

/**
 * Hook pour gérer les images de l'équipe
 * 
 * @returns État et méthodes des images
 */
export const useImages = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Non authentifié");
      }

      const { data: imagesData, error: fetchError } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setImages(imagesData || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const imageToDelete = images.find(img => img.id === imageId);
      if (!imageToDelete) throw new Error("Image non trouvée");

      // 1. Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('team-images')
        .remove([imageToDelete.storage_path]);

      if (storageError) throw storageError;

      // 2. Supprimer de la table
      const { error: deleteError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (deleteError) throw deleteError;

      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Error deleting image:', err);
      throw err;
    }
  }, [images]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    loading,
    error,
    fetchImages,
    deleteImage,
  };
};
