import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/features/team";
import { toast } from "sonner";
import { Loader2, Globe, Instagram, Building2 } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

/**
 * Modal d'onboarding simplifiée pour configurer la marque
 * Affiche uniquement 3 champs : nom, site web, Instagram
 */
export const OnboardingModal = ({ open, onOpenChange, onComplete }: OnboardingModalProps) => {
  const { teamId } = useCurrentTeam();
  
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }

    if (!teamId) {
      toast.error("Erreur: équipe non trouvée");
      return;
    }

    setIsSubmitting(true);

    try {
      // Créer le profil de marque avec analysis_status = 'pending'
      const { error: insertError } = await supabase
        .from('brand_profiles')
        .insert({
          team_id: teamId,
          company_name: companyName.trim(),
          website_url: websiteUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          analysis_status: websiteUrl.trim() ? 'pending' : null,
        });

      if (insertError) {
        // Si le profil existe déjà, le mettre à jour
        if (insertError.code === '23505') {
          const { error: updateError } = await supabase
            .from('brand_profiles')
            .update({
              company_name: companyName.trim(),
              website_url: websiteUrl.trim() || null,
              instagram_url: instagramUrl.trim() || null,
              analysis_status: websiteUrl.trim() ? 'pending' : null,
            })
            .eq('team_id', teamId);

          if (updateError) throw updateError;
        } else {
          throw insertError;
        }
      }

      // Lancer l'analyse en background si une URL est fournie
      if (websiteUrl.trim() || instagramUrl.trim()) {
        supabase.functions.invoke('analyze-brand', {
          body: {
            websiteUrl: websiteUrl.trim() || undefined,
            instagramUrl: instagramUrl.trim() || undefined,
          },
        }).catch((error) => {
          console.error('Background analysis error:', error);
        });
      }

      toast.success("Marque configurée avec succès !");
      onComplete();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error("Erreur lors de la configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurez votre marque</DialogTitle>
          <DialogDescription>
            Ces informations nous aideront à personnaliser vos vidéos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* Nom de l'entreprise */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Nom de l'entreprise
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Ma Super Marque"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Site web */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Site web
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://monentreprise.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <Label htmlFor="instagramUrl" className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-muted-foreground" />
              Instagram
            </Label>
            <Input
              id="instagramUrl"
              type="url"
              placeholder="https://instagram.com/mamarque"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button"
              variant="ghost" 
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Passer cette étape
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !companyName.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
