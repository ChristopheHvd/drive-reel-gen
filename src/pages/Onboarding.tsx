import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/features/team";
import { toast } from "sonner";
import { Loader2, Globe, Instagram, Building2 } from "lucide-react";
import logo from "@/assets/quickquick-logo.png";

/**
 * Page d'onboarding pour configurer la marque après inscription
 * Étape optionnelle avec 3 champs : nom, site web, Instagram
 */
const Onboarding = () => {
  const navigate = useNavigate();
  const { teamId, loading: teamLoading } = useCurrentTeam();
  
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      toast.error("Le nom de la marque est requis");
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
          // L'erreur sera gérée via le statut dans la DB
        });
      }

      // Rediriger vers le dashboard
      navigate('/app');
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error("Erreur lors de la configuration");
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/app');
  };

  if (teamLoading) {
    return (
      <main className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img src={logo} alt="QuickQuick" className="h-12 w-12" />
            <span className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              QuickQuick
            </span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-subtle">
          <h1 className="text-2xl font-bold mb-2 text-center">
            Configurez votre marque
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            Ces informations nous aideront à personnaliser vos vidéos
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom de la marque */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Nom de la marque *
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Ma Super Marque"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
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
                placeholder="https://www.example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nous analyserons votre site pour extraire automatiquement vos couleurs et votre identité visuelle
              </p>
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-muted-foreground" />
                Instagram (optionnel)
              </Label>
              <Input
                id="instagramUrl"
                type="url"
                placeholder="https://instagram.com/votremarque"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
              />
            </div>

            {/* Boutons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting || !companyName.trim()}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuer
              </Button>
              
              <Button 
                type="button"
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={handleSkip}
                disabled={isSubmitting}
              >
                Passer cette étape
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Onboarding;
