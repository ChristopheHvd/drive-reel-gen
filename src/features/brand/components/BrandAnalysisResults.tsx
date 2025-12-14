import { VisualIdentity } from "../types";
import { Badge } from "@/components/ui/badge";
import { Palette, MessageCircle, Image } from "lucide-react";

interface BrandAnalysisResultsProps {
  toneOfVoice?: string;
  brandValues?: string[];
  visualIdentity?: VisualIdentity;
  logoUrl?: string;
}

/**
 * Affiche les résultats de l'analyse IA de la marque
 * Montre les couleurs, le ton de voix, le logo extrait, etc.
 */
export const BrandAnalysisResults = ({
  toneOfVoice,
  brandValues,
  visualIdentity,
  logoUrl,
}: BrandAnalysisResultsProps) => {
  if (!toneOfVoice && !brandValues?.length && !visualIdentity) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/40">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        Résultats de l'analyse IA
      </h4>

      {/* Logo extrait */}
      {logoUrl && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Image className="w-3 h-3" />
            Logo détecté
          </p>
          <div className="w-16 h-16 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
            <img 
              src={logoUrl} 
              alt="Logo de la marque" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Couleurs dominantes */}
      {visualIdentity?.colors && visualIdentity.colors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Couleurs dominantes</p>
          <div className="flex gap-2 flex-wrap">
            {visualIdentity.colors.map((color, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 rounded-md bg-background border border-border"
              >
                <div
                  className="w-4 h-4 rounded-full border border-border/60"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style visuel */}
      {visualIdentity?.style && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Style visuel</p>
          <p className="text-sm">{visualIdentity.style}</p>
        </div>
      )}

      {/* Tone of Voice */}
      {toneOfVoice && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            Ton de voix
          </p>
          <p className="text-sm">{toneOfVoice}</p>
        </div>
      )}

      {/* Valeurs de marque */}
      {brandValues && brandValues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Valeurs de marque</p>
          <div className="flex gap-2 flex-wrap">
            {brandValues.map((value, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {value}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
