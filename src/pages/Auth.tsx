import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/features/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/daft-funk-logo.png";

const Auth = () => {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      // Check if user has completed onboarding
      const checkOnboarding = async () => {
        const { data } = await supabase
          .from("user_profiles")
          .select("has_completed_onboarding")
          .eq("user_id", user.id)
          .single();

        if (data?.has_completed_onboarding) {
          navigate("/app");
        } else {
          navigate("/onboarding");
        }
      };
      checkOnboarding();
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Error during Google sign in:", error);
      toast.error("Erreur lors de la connexion avec Google");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-8">
            <img src={logo} alt="Daft Funk" className="h-12 w-12" />
            <span className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Daft Funk
            </span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-subtle">
          <h1 className="text-2xl font-bold mb-2 text-center">
            Bienvenue
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Connectez-vous avec votre compte Google pour commencer
          </p>

          <Button
            onClick={handleGoogleLogin}
            variant="premium"
            size="lg"
            className="w-full"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-6">
            En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
