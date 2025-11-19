import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriveImage } from "../types";

/**
 * Hook pour gérer les images synchronisées depuis Google Drive
 * 
 * @returns {Object} État et méthodes des images Drive
 * @returns {DriveImage[]} images - Liste des images synchronisées
 * @returns {boolean} loading - Indique si le chargement est en cours
 * @returns {Error | null} error - Erreur éventuelle
 * @returns {Function} fetchImages - Fonction pour recharger les images
 * @returns {Function} deleteImage - Fonction pour supprimer une image
 * 
 * @example
 * ```tsx
 * const { images, loading, fetchImages } = useDriveImages();
 * 
 * useEffect(() => {
 *   fetchImages();
 * }, [fetchImages]);
 * ```
 */
export const useDriveImages = () => {
  const [images, setImages] = useState<DriveImage[]>([]);
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

      const { data: driveImages, error: fetchError } = await supabase
        .from('drive_images')
        .select('*')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false });

      if (fetchError) throw fetchError;

      setImages(driveImages || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching drive images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('drive_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) throw deleteError;

      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Error deleting image:', err);
      throw err;
    }
  }, []);

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
