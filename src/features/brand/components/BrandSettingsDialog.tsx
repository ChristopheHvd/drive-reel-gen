import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useBrandProfile } from "../hooks/useBrandProfile";
import { useBrandAnalysis } from "../hooks/useBrandAnalysis";
import { BrandForm } from "./BrandForm";
import { BrandAnalysisButton } from "./BrandAnalysisButton";
import { BrandAnalysisResults } from "./BrandAnalysisResults";
import { BrandFormData } from "../types";

interface BrandSettingsDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Modal de gestion des paramètres de marque
 * Permet de saisir et d'analyser les informations de marque
 */
export const BrandSettingsDialog = ({ trigger, open: controlledOpen, onOpenChange }: BrandSettingsDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<BrandFormData>>({});

  // Support controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const { profile, loading, loadProfile, updateProfile } = useBrandProfile();
  const { analyzeBrand, isAnalyzing } = useBrandAnalysis();

  useEffect(() => {
    if (open && !loading && profile) {
      setFormData({
        companyName: profile.company_name,
        websiteUrl: profile.website_url || "",
        instagramUrl: profile.instagram_url || "",
        businessDescription: profile.business_description || "",
        targetAudience: profile.target_audience || "",
      });
    }
  }, [open, loading, profile]);

  const handleAnalyze = async () => {
    if (!formData.websiteUrl && !formData.instagramUrl) {
      toast.error("Veuillez entrer l'URL du site web ou d'Instagram");
      return;
    }

    try {
      await analyzeBrand(formData.websiteUrl, formData.instagramUrl);
      toast.success("Analyse de la marque terminée !");
      await loadProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'analyse");
    }
  };

  const handleSubmit = async (values: BrandFormData) => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        company_name: values.companyName,
        website_url: values.websiteUrl,
        instagram_url: values.instagramUrl,
        business_description: values.businessDescription,
        target_audience: values.targetAudience,
      });

      toast.success("Profil de marque enregistré avec succès !");
      setOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Paramètres de la marque</DialogTitle>
        <DialogDescription>
          Configurez les informations de votre marque pour personnaliser vos vidéos
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <BrandForm defaultValues={formData} onSubmit={handleSubmit}>
          <div className="space-y-4">
            <BrandAnalysisButton
              websiteUrl={formData.websiteUrl}
              instagramUrl={formData.instagramUrl}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />

            {/* Afficher les résultats de l'analyse si disponibles */}
            {profile && (profile.tone_of_voice || profile.brand_values?.length || profile.visual_identity) && (
              <BrandAnalysisResults
                toneOfVoice={profile.tone_of_voice}
                brandValues={profile.brand_values}
                visualIdentity={profile.visual_identity}
                logoUrl={profile.visual_identity?.logo}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </div>
        </BrandForm>
      )}
    </DialogContent>
  );

  // If controlled, don't use DialogTrigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Paramètres de marque</Button>}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};
