import { useState, useEffect } from "react";
import { Trash2, Eye, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Card 
        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
          isSelected ? 'ring-2 ring-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]' : 'hover:shadow-[0_8px_30px_hsl(var(--primary)/0.12)]'
        }`}
        onClick={() => onSelect?.(image)}
      >
        {/* Image avec overlay gradient subtil */}
        <div className="aspect-square bg-muted relative">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={image.file_name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Gradient overlay subtil pour améliorer la lisibilité */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Eye className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
          )}
        </div>

        {/* Bouton supprimer - plus discret et élégant */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-lg z-10 w-8 h-8"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
          disabled={isDeleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>

        {/* Overlay avec bouton génération vidéo - design premium */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <Button
            variant="default"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateVideo();
            }}
            className="gap-2 bg-primary/90 hover:bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.7)] transition-all duration-300 hover:scale-105 font-semibold"
          >
            <Video className="w-5 h-5" />
            Générer une vidéo
          </Button>
        </div>

        {/* Info en bas - design plus soigné */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/95 to-background/80 backdrop-blur-sm border-t border-border/50">
          <p className="text-xs truncate font-semibold text-foreground">{image.file_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(image.file_size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </Card>

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
