import { useState, useEffect } from "react";
import { Trash2, Download, Eye } from "lucide-react";
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
}

/**
 * Card pour afficher une image avec actions
 */
export const ImageCard = ({ image, onDelete, onSelect, isSelected }: ImageCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Charger l'URL de l'image
  useEffect(() => {
    const loadImageUrl = async () => {
      const { data } = supabase.storage
        .from('team-images')
        .getPublicUrl(image.storage_path);
      
      setImageUrl(data.publicUrl);
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

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement démarré");
    } catch {
      toast.error("Erreur lors du téléchargement");
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

        {/* Overlay avec actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
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
