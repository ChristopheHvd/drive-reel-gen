import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useToast } from '@/hooks/use-toast';

export const Invite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Lien d\'invitation invalide');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  // Vérifier automatiquement si l'utilisateur a été auto-join après connexion
  useEffect(() => {
    if (user && invitation && !authLoading) {
      checkAutoJoin();
    }
  }, [user, invitation, authLoading]);

  const loadInvitation = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      // Charger l'invitation via la fonction sécurisée (pas de SELECT direct)
      const { data: invitationData, error: invitationError } = await supabase
        .rpc('get_invitation_by_token', { _token: token });

      if (invitationError) throw invitationError;

      if (!invitationData || invitationData.length === 0) {
        setError('Invitation introuvable');
        return;
      }

      const invitationResult = invitationData[0];

      // Vérifier si l'invitation est déjà acceptée
      if (invitationResult.status === 'accepted') {
        // Si acceptée, rediriger vers le dashboard
        toast({
          title: 'Invitation déjà acceptée',
          description: `Vous êtes déjà membre de l'équipe ${invitationResult.team_name}`,
        });
        navigate('/app');
        return;
      }

      if (invitationResult.status !== 'pending') {
        setError(`Cette invitation a déjà été annulée`);
        return;
      }

      if (new Date(invitationResult.expires_at) < new Date()) {
        setError('Cette invitation a expiré');
        return;
      }

      setInvitation(invitationResult);
      setTeam({ name: invitationResult.team_name });
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Impossible de charger l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si le trigger handle_new_user() a auto-join l'utilisateur
  const checkAutoJoin = async () => {
    if (!user || !invitation) return;

    // Vérifier si l'utilisateur a déjà été ajouté à cette équipe par le trigger
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', invitation.team_id)
      .maybeSingle();

    if (membership) {
      // L'utilisateur a été auto-join par le trigger
      toast({
        title: 'Bienvenue dans l\'équipe !',
        description: `Vous avez rejoint l'équipe ${team?.name}`,
      });
      navigate('/app');
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Rediriger vers l'authentification avec le token et l'email dans l'URL
      navigate(`/auth?invite=${token}&email=${encodeURIComponent(invitation.email)}`);
      return;
    }

    // Vérifier que l'email de l'utilisateur correspond à l'invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast({
        title: 'Email incorrect',
        description: `Cette invitation est destinée à ${invitation.email}. Veuillez vous connecter avec ce compte.`,
        variant: 'destructive',
      });
      return;
    }

    setAccepting(true);
    try {
      // Vérifier si l'utilisateur est déjà membre d'une team
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id, team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Si déjà membre de cette équipe spécifique, c'est OK
      if (existingMembership?.team_id === invitation.team_id) {
        toast({
          title: 'Vous êtes déjà membre',
          description: `Vous êtes déjà membre de l'équipe ${team.name}`,
        });
        navigate('/app');
        return;
      }

      // Si membre d'une autre équipe, erreur
      if (existingMembership) {
        toast({
          title: 'Erreur',
          description: 'Vous êtes déjà membre d\'une autre équipe',
          variant: 'destructive',
        });
        return;
      }

      // Accepter l'invitation
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // Marquer l'invitation comme acceptée
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast({
        title: 'Invitation acceptée',
        description: `Vous avez rejoint l'équipe ${team.name}`,
      });

      // Rediriger vers le dashboard
      navigate('/app');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter l\'invitation',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Invitation invalide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier si l'utilisateur est connecté avec le mauvais email
  const isWrongEmail = user && invitation && user.email?.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Invitation à rejoindre une équipe</CardTitle>
          </div>
          <CardDescription>
            Vous avez été invité à rejoindre <strong>{team?.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-medium">Rôle :</span>{' '}
              <span className="capitalize">{invitation?.role}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Email invité :</span>{' '}
              {invitation?.email}
            </p>
          </div>

          {!user && (
            <p className="text-sm text-muted-foreground">
              Vous devez vous connecter ou créer un compte pour accepter cette invitation
            </p>
          )}

          {isWrongEmail && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                Vous êtes connecté avec {user.email}, mais cette invitation est destinée à {invitation.email}.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
              disabled={accepting}
            >
              Refuser
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1"
              disabled={accepting || isWrongEmail}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Acceptation...
                </>
              ) : user ? (
                'Accepter'
              ) : (
                'Se connecter'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
