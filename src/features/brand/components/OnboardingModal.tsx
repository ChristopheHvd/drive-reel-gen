import { useState, useEffect } from "react";
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
  const [teamName, setTeamName] = useState<string | null>(null);

  // Récupérer le nom de l'équipe pour le profil minimal
  useEffect(() => {
    const fetchTeamName = async () => {
      if (!teamId) return;
      
      const { data } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();
      
      if (data) {
        setTeamName(data.name);
      }
    };
    
    fetchTeamName();
  }, [teamId]);

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
      const hasUrls = websiteUrl.trim() || instagramUrl.trim();
      
      // Créer le profil de marque avec analysis_status = 'todo' si URLs fournies
      const { error: insertError } = await supabase
        .from('brand_profiles')
        .insert({
          team_id: teamId,
          company_name: companyName.trim(),
          website_url: websiteUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          analysis_status: hasUrls ? 'todo' : null,
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
              analysis_status: hasUrls ? 'todo' : null,
            })
            .eq('team_id', teamId);

          if (updateError) throw updateError;
        } else {
          throw insertError;
        }
      }

      // Fermer la modal immédiatement AVANT de lancer l'analyse
      onComplete();
      onOpenChange(false);

      // Lancer l'analyse en background si une URL est fournie (fire-and-forget)
      if (hasUrls) {
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
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error("Erreur lors de la configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!teamId) {
      onComplete();
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);

    try {
      // Créer un profil minimal avec le nom de l'équipe
      const defaultCompanyName = teamName || "Mon entreprise";
      
      const { error: insertError } = await supabase
        .from('brand_profiles')
        .insert({
          team_id: teamId,
          company_name: defaultCompanyName,
          analysis_status: null, // Pas d'analyse à faire
        });

      // Ignorer l'erreur si le profil existe déjà (23505 = unique violation)
      if (insertError && insertError.code !== '23505') {
        console.error('Error creating minimal profile:', insertError);
      }

      onComplete();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Skip onboarding error:', error);
      // On ferme quand même la modal
      onComplete();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
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
              Le faire plus tard
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
