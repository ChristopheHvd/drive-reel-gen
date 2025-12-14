import { useState } from "react";
import { Upload, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandSettingsDialog } from "@/features/brand/components/BrandSettingsDialog";

interface EmptyStateOnboardingProps {
  onUploadClick: () => void;
}

/**
 * Écran d'onboarding affiché quand l'utilisateur n'a pas encore d'images
 * Propose 2 options : upload d'images ou configuration de la marque
 */
export const EmptyStateOnboarding = ({ onUploadClick }: EmptyStateOnboardingProps) => {
  const [showBrandDialog, setShowBrandDialog] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Bienvenue sur QuickQuick</h2>
        <p className="text-muted-foreground max-w-md">
          Commencez par configurer votre marque ou uploadez directement vos images pour générer des vidéos marketing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Option 1: Upload images */}
        <Card 
          className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={onUploadClick}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-lg">Uploader des images</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Importez vos photos produits pour commencer à générer des vidéos immédiatement
            </CardDescription>
          </CardContent>
        </Card>

        {/* Option 2: Configure brand */}
        <Card 
          className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => setShowBrandDialog(true)}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <Palette className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-lg">Configurer ma marque</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Notre IA analysera votre site et Instagram pour personnaliser vos vidéos
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <BrandSettingsDialog 
        open={showBrandDialog}
        onOpenChange={setShowBrandDialog}
      />
    </div>
  );
};
