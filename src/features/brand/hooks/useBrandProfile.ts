import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandProfile, UpdateBrandDto } from "../types";

/**
 * Hook pour gérer le profil de marque de l'utilisateur
 * 
 * @returns {Object} État et méthodes du profil de marque
 * @returns {BrandProfile | null} profile - Le profil de marque actuel
 * @returns {boolean} loading - Indique si le chargement est en cours
 * @returns {Error | null} error - Erreur éventuelle
 * @returns {Function} loadProfile - Fonction pour charger le profil
 * @returns {Function} updateProfile - Fonction pour mettre à jour le profil
 * 
 * @example
 * ```tsx
 * const { profile, loading, loadProfile, updateProfile } = useBrandProfile();
 * 
 * useEffect(() => {
 *   loadProfile();
 * }, [loadProfile]);
 * ```
 */
export const useBrandProfile = () => {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Non authentifié");
      }

      const { data: brandProfile, error: fetchError } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (brandProfile) {
        setProfile({
          ...brandProfile,
          brand_values: (brandProfile.brand_values as string[]) || [],
          visual_identity: brandProfile.visual_identity as any,
        });
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error loading brand profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: UpdateBrandDto) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Non authentifié");
      }

      const { data: existingProfile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const profileData = {
        user_id: user.id,
        company_name: data.company_name,
        website_url: data.website_url,
        business_description: data.business_description,
        target_audience: data.target_audience,
        tone_of_voice: data.tone_of_voice,
        brand_values: data.brand_values as any,
        visual_identity: data.visual_identity as any,
      };

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('brand_profiles')
          .update(profileData)
          .eq('id', existingProfile.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('brand_profiles')
          .insert(profileData);

        if (insertError) throw insertError;
      }

      await loadProfile();
    } catch (err) {
      setError(err as Error);
      console.error('Error updating brand profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
  };
};
