import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface BrandAnalysisButtonProps {
  websiteUrl?: string;
  onAnalyze: () => void | Promise<void>;
  isAnalyzing: boolean;
}

/**
 * Bouton pour déclencher l'analyse de marque via IA
 * @param websiteUrl - URL du site web à analyser
 * @param onAnalyze - Callback appelé lors du clic
 * @param isAnalyzing - Indique si l'analyse est en cours
 */
export const BrandAnalysisButton = ({ 
  websiteUrl, 
  onAnalyze, 
  isAnalyzing 
}: BrandAnalysisButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onAnalyze}
      disabled={!websiteUrl || isAnalyzing}
      className="w-full"
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyse en cours...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Analyser avec IA
        </>
      )}
    </Button>
  );
};
