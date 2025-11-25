import { useState, useEffect } from "react";
import { Trash2, Eye, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImageCardProps {
  image: Image;
  onDelete: (imageId: string) => void;
  onSelect?: (image: Image) => void;
  isSelected?: boolean;
  onGenerateVideo?: (imageId: string) => void;
}

/**
 * Card pour afficher une image avec actions
 */
export const ImageCard = ({ image, onDelete, onSelect, isSelected, onGenerateVideo }: ImageCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Charger l'URL de l'image avec signed URL valide 1 an
  useEffect(() => {
    const loadImageUrl = async () => {
      const { data, error } = await supabase.storage
        .from('team-images')
        .createSignedUrl(image.storage_path, 157680000); // 5 ans en secondes
      
      if (error) {
        console.error('Erreur génération signed URL:', error);
        return;
      }
      
      if (data) {
        setImageUrl(data.signedUrl);
      }
    };
    loadImageUrl();
  }, [image.storage_path]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(image.id);
      toast.success("Image supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleGenerateVideo = () => {
    if (onGenerateVideo) {
      onGenerateVideo(image.id);
    }
  };

  return (
    <>
      <div 
        className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-2 ring-primary' 
            : 'ring-1 ring-border/50 hover:ring-border'
        }`}
        onClick={() => onSelect?.(image)}
      >
        {/* Image */}
        <div className="aspect-square bg-muted/50 relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={image.file_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Eye className="w-6 h-6 text-muted-foreground animate-pulse" />
            </div>
          )}

          {/* Checkmark sélection */}
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-20">
              <svg 
                className="w-4 h-4 text-primary-foreground" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Bouton générer en bas à droite */}
          {!isSelected && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateVideo();
              }}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary hover:bg-primary/90 gap-1.5 h-8 px-3 z-10"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="text-xs">Générer</span>
            </Button>
          )}

          {/* Bouton supprimer en haut à droite */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/90 hover:bg-destructive hover:text-destructive-foreground w-7 h-7 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            disabled={isDeleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette image ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'image sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
