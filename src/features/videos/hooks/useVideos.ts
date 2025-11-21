import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "../types";

/**
 * Hook pour gérer les vidéos générées
 */
export const useVideos = (imageId?: string) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Implémenter la requête Supabase quand la table videos sera créée
      // Pour l'instant, retourner un tableau vide
      setVideos([]);
      
    } catch (e) {
      setError(e as Error);
      console.error("Error fetching videos:", e);
    } finally {
      setLoading(false);
    }
  }, [imageId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    refetchVideos: fetchVideos,
  };
};
