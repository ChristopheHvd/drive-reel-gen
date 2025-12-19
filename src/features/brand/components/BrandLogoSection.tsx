import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Image, Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BrandLogoSectionProps {
  logoUrl?: string | null;
  onLogoChange: (newLogoUrl: string | null) => Promise<void>;
}

/**
 * Section pour afficher et modifier le logo de la marque
 */
export const BrandLogoSection = ({ logoUrl, onLogoChange }: BrandLogoSectionProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: teamMember } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!teamMember) throw new Error("Équipe non trouvée");

      // Générer un nom de fichier unique
      const fileExt = file.name.split(".").pop();
      const fileName = `${teamMember.team_id}/logo-${Date.now()}.${fileExt}`;

      // Upload vers le storage
      const { error: uploadError } = await supabase.storage
        .from("team-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from("team-images")
        .getPublicUrl(fileName);

      await onLogoChange(publicUrl);
      toast.success("Logo mis à jour avec succès");
    } catch (error) {
      console.error("Erreur upload logo:", error);
      toast.error("Erreur lors de l'upload du logo");
    } finally {
      setIsUploading(false);
      // Reset input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await onLogoChange(null);
      toast.success("Logo supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression du logo");
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Image className="w-4 h-4 text-primary" />
        Logo de la marque
      </Label>

      <div className="flex items-center gap-4">
        {/* Prévisualisation du logo */}
        <div className="w-20 h-20 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo de la marque"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground text-center px-2">
              Aucun logo
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {logoUrl ? "Changer" : "Ajouter"}
          </Button>

          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLogo}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Format recommandé : PNG ou SVG avec fond transparent, max 5 Mo
      </p>
    </div>
  );
};
