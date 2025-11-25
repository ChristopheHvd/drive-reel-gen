import { useState } from "react";
import { ImageCard } from "./ImageCard";
import { Image } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageGridProps {
  images: Image[];
  loading: boolean;
  onDeleteImage: (imageId: string) => void;
  onSelectImage?: (image: Image) => void;
  selectedImageId?: string;
  onGenerateVideo?: (imageId: string) => void;
}

/**
 * Grille d'affichage des images
 */
export const ImageGrid = ({ 
  images, 
  loading, 
  onDeleteImage, 
  onSelectImage,
  selectedImageId,
  onGenerateVideo
}: ImageGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="text-sm mb-1">Aucune image</p>
        <p className="text-xs">Uploadez pour commencer</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          onDelete={onDeleteImage}
          onSelect={onSelectImage}
          isSelected={image.id === selectedImageId}
          onGenerateVideo={onGenerateVideo}
        />
      ))}
    </div>
  );
};
