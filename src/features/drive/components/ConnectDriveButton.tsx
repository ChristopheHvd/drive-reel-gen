import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

interface ConnectDriveButtonProps {
  onConnected?: () => void;
  variant?: "premium" | "default" | "outline";
  className?: string;
}

export const ConnectDriveButton = ({ 
  onConnected, 
  variant = "premium",
  className = ""
}: ConnectDriveButtonProps) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('drive_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .single();

      setIsConnected(!!data?.refresh_token);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Non authentifié");
        return;
      }

      // Get OAuth URL from edge function
      const { data, error } = await supabase.functions.invoke('google-drive-auth/authorize', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error || !data?.authUrl) {
        console.error('Error getting auth URL:', error);
        toast.error("Erreur lors de la génération de l'URL d'autorisation");
        return;
      }

      // Open popup for OAuth flow
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'GoogleDriveAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error("Impossible d'ouvrir la fenêtre d'autorisation. Vérifiez vos bloqueurs de popup.");
        return;
      }

      // Listen for message from popup
      const messageHandler = async (event: MessageEvent) => {
        // Verify origin if needed
        if (event.data?.error) {
          console.error('OAuth error:', event.data.error);
          toast.error("Erreur lors de l'autorisation Google Drive");
          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
          return;
        }

        if (event.data?.success && event.data?.refreshToken) {
          console.log('✅ Received refresh token from popup');
          
          // Save the token
          const { error: saveError } = await supabase.functions.invoke('google-drive-auth/save-token', {
            body: { refreshToken: event.data.refreshToken },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (saveError) {
            console.error('Error saving token:', saveError);
            toast.error("Erreur lors de la sauvegarde du token");
          } else {
            toast.success("Google Drive connecté avec succès !");
            setIsConnected(true);
            onConnected?.();
          }

          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', messageHandler);

      // Cleanup if popup is closed without completing
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting Drive:', error);
      toast.error("Erreur lors de la connexion à Google Drive");
      setIsConnecting(false);
    }
  };

  if (isConnected === null) {
    return (
      <Button variant={variant} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Vérification...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button variant="outline" disabled className={className}>
        <Check className="h-4 w-4 mr-2 text-green-500" />
        Drive connecté
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={handleConnect}
      disabled={isConnecting}
      className={className}
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Connexion en cours...
        </>
      ) : (
        'Connecter mon Google Drive'
      )}
    </Button>
  );
};
