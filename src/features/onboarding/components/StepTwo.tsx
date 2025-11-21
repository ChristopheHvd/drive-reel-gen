import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DriveFolderBrowser, ConnectDriveButton } from "@/features/drive";

interface StepTwoProps {
  onComplete: () => void;
}

const StepTwo = ({ onComplete }: StepTwoProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasDriveAccess, setHasDriveAccess] = useState<boolean | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);

  useEffect(() => {
    checkDriveAccess();
  }, []);

  const checkDriveAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokenData } = await supabase
        .from('drive_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .single();

      setHasDriveAccess(!!tokenData?.refresh_token);
    } catch (error) {
      setHasDriveAccess(false);
    }
  };

  const handleFolderSelected = async (folderId: string, folderName: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase.functions.invoke('sync-google-drive', {
        body: {
          folderId,
          folderName,
          action: 'connect',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ has_completed_onboarding: true })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast.success("Google Drive connecté avec succès !");
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la connexion");
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
        .from('user_profiles')
        .update({ has_completed_onboarding: true })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Configuration terminée !");
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erreur lors de la finalisation");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Connecter Google Drive</h2>
        <p className="text-muted-foreground">
          Synchronisez vos images depuis Google Drive pour générer automatiquement des vidéos
        </p>
      </div>

      {hasDriveAccess === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !hasDriveAccess && !showBrowser ? (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Synchronisation automatique :</strong> Nous allons synchroniser 
              les images de votre Google Drive pour générer automatiquement des vidéos 
              à partir de vos contenus.
            </p>
          </div>

          <ConnectDriveButton 
            variant="premium"
            className="w-full"
            onConnected={() => {
              checkDriveAccess();
              toast.success("Vous pouvez maintenant sélectionner un dossier");
            }}
          />

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full"
          >
            Passer cette étape
          </Button>
        </div>
      ) : !showBrowser ? (
        <div className="space-y-4">
          <Button
            variant="premium"
            onClick={() => setShowBrowser(true)}
            className="w-full"
          >
            Sélectionner un dossier
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full"
          >
            Passer cette étape
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <DriveFolderBrowser onFolderSelected={handleFolderSelected} />
          
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full"
          >
            Passer cette étape
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepTwo;
