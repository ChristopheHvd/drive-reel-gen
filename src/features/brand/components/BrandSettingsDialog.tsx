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
import { BrandFormData } from "../types";

interface BrandSettingsDialogProps {
  trigger?: React.ReactNode;
}

/**
 * Modal de gestion des paramètres de marque
 * Permet de saisir et d'analyser les informations de marque
 */
export const BrandSettingsDialog = ({ trigger }: BrandSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<BrandFormData>>({});

  const { profile, loading, loadProfile, updateProfile } = useBrandProfile();
  const { analyzeBrand, isAnalyzing } = useBrandAnalysis();

  useEffect(() => {
    if (open && !loading && profile) {
      setFormData({
        companyName: profile.company_name,
        websiteUrl: profile.website_url || "",
        businessDescription: profile.business_description || "",
        targetAudience: profile.target_audience || "",
      });
    }
  }, [open, loading, profile]);

  const handleAnalyze = async () => {
    if (!formData.websiteUrl) {
      toast.error("Veuillez entrer l'URL du site web");
      return;
    }

    try {
      await analyzeBrand(formData.websiteUrl);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Paramètres de marque</Button>}
      </DialogTrigger>
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
            <div className="space-y-3">
              <BrandAnalysisButton
                websiteUrl={formData.websiteUrl}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />

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
    </Dialog>
  );
};
