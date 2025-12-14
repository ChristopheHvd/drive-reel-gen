import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook pour analyser un site web et extraire les informations de marque via IA
 * 
 * @returns {Object} État et méthode d'analyse
 * @returns {boolean} isAnalyzing - Indique si l'analyse est en cours
 * @returns {Function} analyzeBrand - Fonction pour lancer l'analyse
 * 
 * @example
 * ```tsx
 * const { analyzeBrand, isAnalyzing } = useBrandAnalysis();
 * 
 * const handleAnalyze = async () => {
 *   try {
 *     await analyzeBrand('https://example.com');
 *     toast.success('Analyse terminée !');
 *   } catch (error) {
 *     toast.error('Erreur lors de l\'analyse');
 *   }
 * };
 * ```
 */
export const useBrandAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeBrand = useCallback(async (websiteUrl?: string, instagramUrl?: string) => {
    if (!websiteUrl && !instagramUrl) {
      throw new Error("Au moins une URL (site web ou Instagram) est requise");
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-brand', {
        body: { websiteUrl, instagramUrl }
      });

      if (error) {
        console.error('Error analyzing brand:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Brand analysis error:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeBrand,
    isAnalyzing,
  };
};
