import { useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  className?: string;
}

/**
 * Composant compact pour upload d'images (logo ou image additionnelle)
 * Détecte le format portrait/paysage et alerte si nécessaire
 */
export const MediaUploader = ({ label, onFileSelect, accept = "image/*", className }: MediaUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const landscape = img.width > img.height;
        setIsLandscape(landscape);
        setPreview(event.target?.result as string);
        onFileSelect(file);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName(null);
    setIsLandscape(false);
    onFileSelect(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      
      {!preview ? (
        <label className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="w-5 h-5" />
            <span className="text-xs">Cliquer pour uploader</span>
          </div>
        </label>
      ) : (
        <div className="space-y-2">
          <div className="relative h-24 border border-border rounded-lg overflow-hidden bg-muted">
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
              onClick={handleRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          {isLandscape && (
            <Alert variant="default" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Image en format paysage détectée. Elle sera automatiquement recadrée pour s'adapter au format vidéo.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-xs text-muted-foreground truncate">{fileName}</p>
        </div>
      )}
    </div>
  );
};
