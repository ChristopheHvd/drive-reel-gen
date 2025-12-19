import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/features/team";
import type { BrandProfile } from "../types";

type AnalysisStatus = 'pending' | 'completed' | 'failed' | null;

/**
 * Hook pour surveiller le statut de l'analyse de marque en temps réel
 * Utilise Supabase Realtime pour détecter les changements
 */
export const useBrandAnalysisStatus = () => {
  const { teamId } = useCurrentTeam();
  const [status, setStatus] = useState<AnalysisStatus>(null);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching brand profile:', error);
        return;
      }

      if (data) {
        // Safe casting - convert DB types to app types
        const profile: BrandProfile = {
          ...data,
          brand_values: data.brand_values as unknown as string[] | null,
          visual_identity: data.visual_identity as unknown as BrandProfile['visual_identity'],
          analysis_status: data.analysis_status as AnalysisStatus,
        };
        setProfile(profile);
        setStatus(data.analysis_status as AnalysisStatus);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`brand-analysis-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'brand_profiles',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          console.log('Brand profile updated:', payload);
          const newData = payload.new as Record<string, unknown>;
          const updatedProfile: BrandProfile = {
            id: newData.id as string,
            team_id: newData.team_id as string,
            company_name: newData.company_name as string,
            website_url: newData.website_url as string | null,
            instagram_url: newData.instagram_url as string | null,
            business_description: newData.business_description as string | null,
            target_audience: newData.target_audience as string | null,
            tone_of_voice: newData.tone_of_voice as string | null,
            brand_values: newData.brand_values as unknown as string[] | null,
            visual_identity: newData.visual_identity as unknown as BrandProfile['visual_identity'],
            analyzed_at: newData.analyzed_at as string | null,
            analysis_status: newData.analysis_status as AnalysisStatus,
            created_at: newData.created_at as string,
            updated_at: newData.updated_at as string,
          };
          setProfile(updatedProfile);
          setStatus(newData.analysis_status as AnalysisStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Clear the status after showing "completed" for a few seconds
  const clearCompletedStatus = useCallback(() => {
    if (status === 'completed') {
      setStatus(null);
    }
  }, [status]);

  return {
    status,
    profile,
    loading,
    refetch: fetchProfile,
    clearCompletedStatus,
  };
};
