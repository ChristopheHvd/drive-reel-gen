import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Video } from "../types";
import { Image } from "@/features/images/types";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface VideoErrorCardProps {
  video: Video;
  image: Image;
  onDelete: (videoId: string) => void;
  onRegenerate?: (video: Video) => void;
}

/**
 * Affiche une vidéo en erreur avec le message d'erreur et les actions disponibles
 * Structure identique à VideoPlayer et VideoLoadingPlaceholder
 */
export const VideoErrorCard = ({ 
  video, 
  image, 
  onDelete, 
  onRegenerate 
}: VideoErrorCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  const errorMessage = video.error_message || "Une erreur s'est produite lors de la génération";
  
  // Charger l'URL signée de l'image
  useEffect(() => {
    const loadImageUrl = async () => {
      const { data } = await supabase.storage
        .from('team-images')
        .createSignedUrl(image.storage_path, 31536000);
      
      if (data) setImageUrl(data.signedUrl);
    };
    
    loadImageUrl();
  }, [image]);

  return (
    <>
      <div className="group relative overflow-hidden rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
        {/* Container avec aspect-video pour correspondre aux autres composants */}
        <div className="relative aspect-video flex items-center justify-center overflow-hidden">
          {/* Image source floue en fond */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={image.file_name}
              className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 opacity-30"
            />
          )}
          
          {/* Overlay semi-transparent rouge */}
          <div className="absolute inset-0 bg-destructive/50" />
          
          {/* Contenu central */}
          <div className="relative z-10 text-center space-y-3 p-4">
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive-foreground" />
            
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-destructive-foreground">
                Échec de génération
              </h3>
              <p className="text-xs text-destructive-foreground/80 line-clamp-2 max-w-[200px] mx-auto">
                {errorMessage}
              </p>
            </div>
            
            {/* Bouton pour voir le message complet */}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowErrorDialog(true);
              }}
              className="text-xs text-destructive-foreground/90 hover:text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              <Info className="w-3 h-3 mr-1" />
              Voir les détails
            </Button>
          </div>
        </div>

        {/* Footer avec actions - même structure que VideoPlayer */}
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video.id);
              }}
              className="flex-1 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Supprimer
            </Button>
            
            {onRegenerate && (
              <Button
                size="sm"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate(video);
                }}
                className="flex-1 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Réessayer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour afficher le message d'erreur complet */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Erreur de génération
            </DialogTitle>
            <DialogDescription className="pt-4 text-foreground whitespace-pre-wrap">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
