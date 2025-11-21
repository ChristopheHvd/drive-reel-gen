import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandProfile, UpdateBrandDto } from "../types";

export const useBrandProfile = () => {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) throw new Error("Équipe non trouvée");

      const { data: brandProfile, error: fetchError } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (brandProfile) {
        setProfile({
          ...brandProfile,
          brand_values: (brandProfile.brand_values as any) || [],
          visual_identity: brandProfile.visual_identity as any,
        } as BrandProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: UpdateBrandDto) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) throw new Error("Équipe non trouvée");

      const { data: existing } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('team_id', teamMember.team_id)
        .maybeSingle();

      const profileData = {
        company_name: data.company_name,
        website_url: data.website_url,
        instagram_url: data.instagram_url,
        business_description: data.business_description,
        target_audience: data.target_audience,
        tone_of_voice: data.tone_of_voice,
        brand_values: data.brand_values as any,
        visual_identity: data.visual_identity as any,
      };

      if (existing) {
        await supabase.from('brand_profiles').update(profileData).eq('team_id', teamMember.team_id);
      } else {
        await supabase.from('brand_profiles').insert([{ team_id: teamMember.team_id, ...profileData }]);
      }

      await loadProfile();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, loading, error, loadProfile, updateProfile };
};
