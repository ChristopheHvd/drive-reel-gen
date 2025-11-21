import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, Loader2 } from "lucide-react";
import { VideoMode, AspectRatio } from "../types";

interface VideoConfigFormProps {
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
export const VideoConfigForm = ({ onGenerate, disabled, loading }: VideoConfigFormProps) => {
  const [mode, setMode] = useState<VideoMode>("packshot");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ mode, prompt, aspectRatio });
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

      <div className="space-y-3">
        <Label>Format de la vidéo</Label>
        <RadioGroup 
          value={aspectRatio} 
          onValueChange={(v) => setAspectRatio(v as AspectRatio)}
          disabled={mode === "situation"}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="9:16" id="9:16" />
            <Label htmlFor="9:16" className="font-normal cursor-pointer">
              9:16 (Vertical)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="16:9" 
              id="16:9"
              disabled={mode !== "situation"}
            />
            <Label 
              htmlFor="16:9" 
              className={`font-normal ${mode === "situation" ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
            >
              16:9 (Horizontal)
            </Label>
          </div>
        </RadioGroup>
        {mode === "situation" && aspectRatio !== "16:9" && (
          <p className="text-xs text-muted-foreground">
            Le mode "En situation" nécessite le format 16:9
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="prompt">Entrez le prompt</Label>
        <Textarea
          id="prompt"
          placeholder="Décrivez la vidéo que vous souhaitez générer..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
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
