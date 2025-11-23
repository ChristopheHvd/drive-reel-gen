import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

/**
 * Hook pour gérer l'authentification des utilisateurs via Google OAuth
 * 
 * @returns {Object} État et méthodes d'authentification
 * @returns {User | null} user - L'utilisateur actuellement connecté
 * @returns {Session | null} session - La session active
 * @returns {boolean} loading - Indique si l'authentification est en cours de chargement
 * @returns {Function} signInWithGoogle - Fonction pour se connecter avec Google
 * @returns {Function} signOut - Fonction pour se déconnecter
 * 
 * @example
 * ```tsx
 * const { user, loading, signInWithGoogle, signOut } = useAuth();
 * 
 * if (loading) return <Spinner />;
 * if (!user) return <button onClick={signInWithGoogle}>Se connecter</button>;
 * return <button onClick={signOut}>Se déconnecter</button>;
 * ```
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/#/app`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly'
      }
    });

    if (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }
    navigate("/");
  };

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut
  };
};
