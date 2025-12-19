import { Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyStateOnboardingProps {
  onUploadClick: () => void;
}

/**
 * Écran affiché quand l'utilisateur n'a pas encore d'images
 * Propose uniquement l'upload d'images pour commencer
 */
export const EmptyStateOnboarding = ({ onUploadClick }: EmptyStateOnboardingProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <ImagePlus className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Uploadez vos premières images</h2>
        <p className="text-muted-foreground max-w-md">
          Importez vos photos produits pour commencer à générer des vidéos marketing
        </p>
      </div>

      <Card 
        className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors cursor-pointer group w-full max-w-md"
        onClick={onUploadClick}
      >
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-lg">Importer des images</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-center">
            Formats acceptés : JPG, PNG
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};
