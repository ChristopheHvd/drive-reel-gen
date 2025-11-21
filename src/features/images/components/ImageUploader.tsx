import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    
    if (files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    setSelectedFiles(files);
  }, [maxFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    
    if (files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    setSelectedFiles(files);
  }, [maxFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await uploadImages(selectedFiles);
      toast.success(`${selectedFiles.length} image(s) uploadée(s) !`);
      setSelectedFiles([]);
      resetProgress();
      onUploadComplete?.();
    } catch {
      toast.error("Erreur lors de l'upload");
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Zone drag'n'drop */}
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

      {/* Fichiers sélectionnés */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm">
            {selectedFiles.length} fichier(s) sélectionné(s)
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-accent rounded-md">
                <span className="flex-1 text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)}MB
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? "Upload en cours..." : `Uploader ${selectedFiles.length} image(s)`}
          </Button>
        </div>
      )}

      {/* Progress bars */}
      {progress.length > 0 && (
        <div className="space-y-2">
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
