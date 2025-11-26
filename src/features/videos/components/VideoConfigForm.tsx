import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Video, Loader2, ChevronRight, PackageOpen, Users, MessageSquareQuote, AlertCircle, Info } from "lucide-react";
import { AspectRatio, PromptType, VideoDuration } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaUploader } from "./MediaUploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VideoConfigFormProps {
  selectedImageId?: string;
  initialPrompt?: string;
  onGenerate: (config: {
    prompt: string;
    aspectRatio: AspectRatio;
    durationSeconds: VideoDuration;
    logoFile?: File;
    additionalImageFile?: File;
  }) => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Formulaire de configuration pour la génération de vidéo
 * - Prompt en premier
 * - 3 boutons pour générer prompt spécialisé
 * - Options avancées : aspect ratio, logo, image additionnelle
 */
export const VideoConfigForm = ({ 
  selectedImageId, 
  initialPrompt,
  onGenerate, 
  disabled, 
  loading 
}: VideoConfigFormProps) => {
  const [prompt, setPrompt] = useState(initialPrompt || "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [durationSeconds, setDurationSeconds] = useState<VideoDuration>(() => {
    const saved = localStorage.getItem('daftfunk-video-duration');
    return saved ? (Number(saved) as VideoDuration) : 8;
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [additionalImageFile, setAdditionalImageFile] = useState<File | null>(null);
  const [loadingPromptType, setLoadingPromptType] = useState<PromptType | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mettre à jour le prompt quand initialPrompt change
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ 
      prompt, 
      aspectRatio,
      durationSeconds,
      logoFile: logoFile || undefined,
      additionalImageFile: additionalImageFile || undefined,
    });
  };

  const handleGeneratePrompt = async (promptType: PromptType) => {
    if (!selectedImageId) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    setLoadingPromptType(promptType);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-prompt', {
        body: { imageId: selectedImageId, promptType }
      });
      
      if (error) throw error;
      
      if (data?.prompt) {
        setPrompt(data.prompt);
        toast.success("Prompt généré avec succès !");
      }
    } catch (error: any) {
      console.error('Error generating prompt:', error);
      toast.error("Erreur lors de la génération du prompt");
    } finally {
      setLoadingPromptType(null);
    }
  };

  const showCropWarning = (logoFile || additionalImageFile) && aspectRatio === "9:16";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt en premier */}
      <div className="space-y-3">
        <Label htmlFor="prompt">Prompt de génération</Label>
        <Textarea
          id="prompt"
          placeholder="Décrivez la vidéo que vous souhaitez générer..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          className="resize-y"
          disabled={loadingPromptType !== null || disabled}
        />
        <p className="text-xs text-muted-foreground">
          Décrivez l'ambiance, les mouvements, et l'esthétique souhaitée
        </p>
      </div>

      {/* 3 boutons pour génération de prompt spécialisé */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Ou générez un prompt avec l'IA :</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGeneratePrompt('situation')}
            disabled={loadingPromptType !== null || !selectedImageId || disabled}
            className="flex flex-col gap-1 h-auto py-2"
          >
            {loadingPromptType === 'situation' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span className="text-xs">Situation</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGeneratePrompt('product')}
            disabled={loadingPromptType !== null || !selectedImageId || disabled}
            className="flex flex-col gap-1 h-auto py-2"
          >
            {loadingPromptType === 'product' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PackageOpen className="w-4 h-4" />
            )}
            <span className="text-xs">Produit</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGeneratePrompt('testimonial')}
            disabled={loadingPromptType !== null || !selectedImageId || disabled}
            className="flex flex-col gap-1 h-auto py-2"
          >
            {loadingPromptType === 'testimonial' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquareQuote className="w-4 h-4" />
            )}
            <span className="text-xs">Témoignage</span>
          </Button>
        </div>
      </div>

      {/* Options avancées */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors group">
          <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
          Options avancées
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Durée de la vidéo */}
          <div className="space-y-3">
            <Label>Durée de la vidéo</Label>
            <RadioGroup 
              value={String(durationSeconds)} 
              onValueChange={(v) => {
                const val = Number(v) as VideoDuration;
                setDurationSeconds(val);
                localStorage.setItem('daftfunk-video-duration', String(val));
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="8" id="dur-8" />
                <Label htmlFor="dur-8" className="font-normal cursor-pointer">
                  8 secondes <span className="text-muted-foreground">(~2min)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16" id="dur-16" />
                <Label htmlFor="dur-16" className="font-normal cursor-pointer flex items-center gap-1">
                  16 secondes <span className="text-muted-foreground">(~4min)</span>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Comptera pour 2 vidéos générées dans votre crédit</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="24" id="dur-24" />
                <Label htmlFor="dur-24" className="font-normal cursor-pointer flex items-center gap-1">
                  24 secondes <span className="text-muted-foreground">(~6min)</span>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Comptera pour 3 vidéos générées dans votre crédit</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Aspect ratio */}
          <div className="space-y-3">
            <Label>Format de la vidéo</Label>
            <RadioGroup 
              value={aspectRatio} 
              onValueChange={(v) => setAspectRatio(v as AspectRatio)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="9:16" id="9:16" />
                <Label htmlFor="9:16" className="font-normal cursor-pointer">
                  9:16 (Vertical - Instagram Reels)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16:9" id="16:9" />
                <Label htmlFor="16:9" className="font-normal cursor-pointer">
                  16:9 (Horizontal - YouTube)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Logo */}
          <MediaUploader
            label="Ajouter un logo (optionnel)"
            onFileSelect={setLogoFile}
          />

          {/* Image additionnelle */}
          <MediaUploader
            label="Ajouter une image source (optionnel)"
            onFileSelect={setAdditionalImageFile}
          />

          {/* Warning recadrage */}
          {showCropWarning && (
            <Alert variant="default" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                La vidéo sera générée en 16:9 puis automatiquement recadrée en 9:16 car vous utilisez des images additionnelles.
              </AlertDescription>
            </Alert>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Bouton génération */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={disabled || loading || loadingPromptType !== null || !prompt.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Video className="w-4 h-4 mr-2" />
            Générer une vidéo
          </>
        )}
      </Button>
    </form>
  );
};
