import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import logo from "@/assets/quickquick-logo.png";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const { user, loading, signInWithGoogle, signInWithEmail, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [activeTab, setActiveTab] = useState<string>("login");

  useEffect(() => {
    if (user && !loading) {
      // Si l'utilisateur vient d'un lien d'invitation, le rediriger vers la page d'invitation
      if (inviteToken) {
        navigate(`/invite?token=${inviteToken}`);
      } else {
        navigate("/app");
      }
    }
  }, [user, loading, navigate, inviteToken]);

  const handleGoogleLogin = async () => {
    try {
      // Préserver le token d'invitation dans la redirection OAuth
      const redirectPath = inviteToken ? `/invite?token=${inviteToken}` : '/app';
      await signInWithGoogle(redirectPath);
    } catch (error) {
      toast.error("Erreur lors de la connexion");
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    const result = await signInWithEmail(email, password);
    if (!result.error) {
      // La redirection est gérée par le useEffect
    }
    return result;
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    const result = await signUp(email, password, fullName);
    if (!result.error) {
      toast.success("Compte créé avec succès !");
      // La redirection est gérée par le useEffect
    }
    return result;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-foreground">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-8">
            <img src={logo} alt="QuickQuick" className="h-12 w-12" />
            <span className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">QuickQuick</span>
          </Link>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-subtle">
          <h1 className="text-2xl font-bold mb-2 text-center">
            {inviteToken ? 'Rejoindre une équipe' : 'Bienvenue'}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {inviteToken 
              ? 'Connectez-vous ou créez un compte pour accepter l\'invitation' 
              : 'Connectez-vous ou créez un compte pour commencer'
            }
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm
                onSubmit={handleEmailLogin}
                onGoogleLogin={handleGoogleLogin}
              />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm
                onSubmit={handleSignUp}
                onGoogleLogin={handleGoogleLogin}
              />
            </TabsContent>
          </Tabs>
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Retour</Link>
        </div>
      </div>
    </main>
  );
};

export default Auth;
