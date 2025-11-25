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
        className={`group relative overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => onSelect?.(image)}
      >
        {/* Image */}
        <div className="aspect-square bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={image.file_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Eye className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
          )}
        </div>

        {/* Bouton supprimer en haut à droite */}
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {/* Overlay avec bouton génération vidéo */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="default"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateVideo();
            }}
            className="gap-2"
          >
            <Video className="w-5 h-5" />
            Générer une vidéo
          </Button>
        </div>

        {/* Info en bas */}
        <div className="p-2 bg-background/95">
          <p className="text-xs truncate font-medium">{image.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {(image.file_size / 1024 / 1024).toFixed(2)}MB
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
