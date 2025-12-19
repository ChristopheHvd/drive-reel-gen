import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface BrandAnalysisButtonProps {
  websiteUrl?: string;
  instagramUrl?: string;
  onAnalyze: () => void | Promise<void>;
  isAnalyzing: boolean;
}

/**
 * Bouton pour déclencher l'analyse de marque via IA
 * @param websiteUrl - URL du site web à analyser
 * @param instagramUrl - URL Instagram à analyser
 * @param onAnalyze - Callback appelé lors du clic
 * @param isAnalyzing - Indique si l'analyse est en cours
 */
export const BrandAnalysisButton = ({ 
  websiteUrl, 
  instagramUrl,
  onAnalyze, 
  isAnalyzing 
}: BrandAnalysisButtonProps) => {
  const hasUrl = !!websiteUrl || !!instagramUrl;
  
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onAnalyze}
      disabled={!hasUrl || isAnalyzing}
      className="text-muted-foreground hover:text-foreground text-xs"
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          Analyse en cours...
        </>
      ) : (
        <>
          <Sparkles className="mr-1.5 h-3 w-3" />
          Recommencer l'analyse
        </>
      )}
    </Button>
  );
};
