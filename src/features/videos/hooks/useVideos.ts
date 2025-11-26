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

      if (!imageId) {
        setVideos([]);
        return;
      }

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('image_id', imageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setVideos((data || []) as Video[]);
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

  // Polling temps réel avec logging
  useEffect(() => {
    if (!imageId) return;

    const channel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `image_id=eq.${imageId}`,
        },
        (payload) => {
          console.log('Video realtime update received:', payload);
          fetchVideos();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [imageId, fetchVideos]);

  return {
    videos,
    loading,
    error,
    refetchVideos: fetchVideos,
  };
};
