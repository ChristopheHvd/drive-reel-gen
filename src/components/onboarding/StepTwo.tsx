import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FolderOpen } from "lucide-react";
import { GoogleDrivePicker } from "@/components/GoogleDrivePicker";

interface StepTwoProps {
  onComplete: () => void;
}

const StepTwo = ({ onComplete }: StepTwoProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleFolderSelected = async (folderId: string, folderName: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Get current session with provider token
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session?.provider_token) {
        toast.error("Impossible d'accéder à Google Drive. Veuillez vous reconnecter.");
        return;
      }

      // Call edge function to sync Google Drive
      const { data, error } = await supabase.functions.invoke('sync-google-drive', {
        body: {
          folderId,
          folderName,
          action: 'connect'
        }
      });

      if (error) throw error;

      console.log('Sync response:', data);
      toast.success(`${data.imagesCount} images synchronisées !`);

      // Mark onboarding as complete
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ has_completed_onboarding: true })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      onComplete();
    } catch (error: any) {
      console.error("Error connecting drive:", error);
      toast.error(error.message || "Erreur lors de la connexion");
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
          onClick={() => setShowPicker(true)}
          variant="premium"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Synchronisation...
            </>
          ) : (
            "Connecter Google Drive"
          )}
        </Button>

        <GoogleDrivePicker
          open={showPicker}
          onOpenChange={setShowPicker}
          onFolderSelected={handleFolderSelected}
        />

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
