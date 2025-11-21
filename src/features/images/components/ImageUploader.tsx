import { useCallback, useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useImageUpload } from "../hooks/useImageUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onUploadComplete?: () => void;
  maxFiles?: number;
}

/**
 * Composant d'upload d'images avec drag'n'drop
 */
export const ImageUploader = ({ onUploadComplete, maxFiles = 10 }: ImageUploaderProps) => {
  const { uploadImages, isUploading, progress, resetProgress } = useImageUpload();
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    if (files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    // Lancer l'upload immédiatement
    try {
      await uploadImages(files);
      toast.success(`${files.length} image(s) uploadée(s) !`);
      resetProgress();
      onUploadComplete?.();
    } catch {
      toast.error("Erreur lors de l'upload");
    }
  }, [maxFiles, uploadImages, resetProgress, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFilesSelected(files);
  }, [handleFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    handleFilesSelected(files);
    
    // Reset input pour permettre la sélection du même fichier
    e.target.value = '';
  }, [handleFilesSelected]);

  return (
    <div className="space-y-4">
      {/* Zone drag'n'drop - Toujours active */}
      {!isUploading && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-border hover:border-primary/50 hover:bg-accent/50"
          )}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Glissez vos images ici ou cliquez pour sélectionner
          </p>
          <p className="text-sm text-muted-foreground">
            JPG, PNG, WEBP, HEIC • Max 10MB par fichier • {maxFiles} fichiers max
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Progress bars - Affichage pendant l'upload */}
      {progress.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm mb-2">
            Upload en cours...
          </h3>
          {progress.map((p, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate max-w-[200px]">{p.fileName}</span>
                <span className={cn(
                  p.status === 'success' && "text-green-600",
                  p.status === 'error' && "text-destructive"
                )}>
                  {p.status === 'success' && "✓"}
                  {p.status === 'error' && p.error}
                  {p.status === 'uploading' && `${p.progress}%`}
                </span>
              </div>
              {p.status === 'uploading' && <Progress value={p.progress} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
