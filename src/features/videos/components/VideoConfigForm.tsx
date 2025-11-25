import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Video, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { VideoMode, AspectRatio } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoConfigFormProps {
  selectedImageId?: string;
  onGenerate: (config: {
    mode: VideoMode;
    prompt: string;
    aspectRatio: AspectRatio;
  }) => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Formulaire de configuration pour la génération de vidéo
 */
export const VideoConfigForm = ({ selectedImageId, onGenerate, disabled, loading }: VideoConfigFormProps) => {
  const [mode, setMode] = useState<VideoMode>("packshot");
  const [prompt, setPrompt] = useState("Génère une vidéo sympa pour Instagram en suivant les codes d'Instagram");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ mode, prompt, aspectRatio });
  };

  const handleGeneratePrompt = async () => {
    if (!selectedImageId) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    setLoadingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-prompt', {
        body: { imageId: selectedImageId }
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
      setLoadingPrompt(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Mode de génération</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as VideoMode)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="packshot" id="packshot" />
            <Label htmlFor="packshot" className="font-normal cursor-pointer">
              Packshot
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="situation" id="situation" />
            <Label htmlFor="situation" className="font-normal cursor-pointer">
              En situation
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="temoignage" id="temoignage" />
            <Label htmlFor="temoignage" className="font-normal cursor-pointer">
              Témoignage
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors group">
          <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
          Options avancées
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pt-4">
          <div className="space-y-3">
            <Label>Format de la vidéo</Label>
            <RadioGroup 
              value={aspectRatio} 
              onValueChange={(v) => setAspectRatio(v as AspectRatio)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="9:16" id="9:16" />
                <Label htmlFor="9:16" className="font-normal cursor-pointer">
                  9:16 (Vertical)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16:9" id="16:9" />
                <Label htmlFor="16:9" className="font-normal cursor-pointer">
                  16:9 (Horizontal)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Par défaut : 9:16 (Instagram Reels). 
              Si le format n'est pas supporté nativement par l'API, une conversion automatique sera appliquée.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt">Entrez le prompt</Label>
          <Button 
            type="button"
            variant="ghost" 
            size="sm"
            onClick={handleGeneratePrompt}
            disabled={loadingPrompt || !selectedImageId}
          >
            {loadingPrompt ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="ml-2">Générer avec IA</span>
          </Button>
        </div>
        <Textarea
          id="prompt"
          placeholder="Décrivez la vidéo que vous souhaitez générer..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Par exemple: 'Produit tournant doucement sur fond blanc avec éclairage doux, ambiance professionnelle et élégante'
        </p>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={disabled || loading || !prompt.trim()}
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
