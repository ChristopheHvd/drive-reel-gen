import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, RotateCcw } from "lucide-react";

interface BrandAnalysisButtonProps {
  websiteUrl?: string;
  instagramUrl?: string;
  onAnalyze: () => void | Promise<void>;
  isAnalyzing: boolean;
}

/**
 * Bouton icône pour déclencher l'analyse de marque via IA
 */
export const BrandAnalysisButton = ({ 
  websiteUrl, 
  instagramUrl,
  onAnalyze, 
  isAnalyzing 
}: BrandAnalysisButtonProps) => {
  const hasUrl = !!websiteUrl || !!instagramUrl;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAnalyze}
          disabled={!hasUrl || isAnalyzing}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          {isAnalyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isAnalyzing ? "Analyse en cours..." : "Recommencer l'analyse"}</p>
      </TooltipContent>
    </Tooltip>
  );
};
