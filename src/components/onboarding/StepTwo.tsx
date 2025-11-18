import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FolderOpen } from "lucide-react";

interface StepTwoProps {
  onComplete: () => void;
}

const StepTwo = ({ onComplete }: StepTwoProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectDrive = async () => {
    setIsLoading(true);
    try {
      // TODO: Implémenter la connexion Google Drive
      toast.info("Connexion Google Drive à implémenter");
      
      // Mark onboarding as complete
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("user_profiles")
        .update({ has_completed_onboarding: true })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Configuration terminée !");
      onComplete();
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error(error.message || "Erreur lors de la finalisation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("user_profiles")
        .update({ has_completed_onboarding: true })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Configuration terminée !");
      onComplete();
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error(error.message || "Erreur lors de la finalisation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Connectez votre Google Drive</h2>
      <p className="text-muted-foreground mb-8">
        Sélectionnez le dossier contenant vos images pour générer automatiquement des vidéos
      </p>

      <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <FolderOpen className="h-16 w-16 text-gold mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Nous allons analyser les images de votre dossier Google Drive pour créer des vidéos engageantes
          </p>
        </div>

        <Button
          onClick={handleConnectDrive}
          variant="premium"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connexion...
            </>
          ) : (
            "Connecter Google Drive"
          )}
        </Button>

        <Button
          onClick={handleSkip}
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          Passer pour le moment
        </Button>
      </div>
    </div>
  );
};

export default StepTwo;
