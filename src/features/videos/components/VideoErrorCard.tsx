import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Video } from "../types";
import { Image } from "@/features/images/types";
import { supabase } from "@/integrations/supabase/client";

interface VideoErrorCardProps {
  video: Video;
  image: Image;
  onDelete: (videoId: string) => void;
  onRegenerate?: (video: Video) => void;
}

/**
 * Affiche une vidéo en erreur avec le message d'erreur et les actions disponibles
 */
export const VideoErrorCard = ({ 
  video, 
  image, 
  onDelete, 
  onRegenerate 
}: VideoErrorCardProps) => {
  // Récupérer l'URL de l'image source
  const { data: imageUrl } = supabase.storage
    .from('images')
    .getPublicUrl(image.storage_path);

  return (
    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
      {/* Image source floue en fond */}
      <img
        src={imageUrl.publicUrl}
        alt={image.file_name}
        className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
      />
      
      {/* Overlay semi-transparent orange/rouge */}
      <div className="absolute inset-0 bg-destructive/60" />
      
      {/* Contenu centré */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-10 h-10 text-destructive-foreground mb-3" />
        
        <p className="text-xs text-destructive-foreground/90 mb-4 line-clamp-4 max-w-[90%]">
          {video.error_message || "Une erreur s'est produite lors de la génération"}
        </p>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(video.id);
            }}
            className="text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Supprimer
          </Button>
          
          {onRegenerate && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(video);
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
