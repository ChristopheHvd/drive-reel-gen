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

  const loadInvitation = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      // Charger l'invitation
      const { data: invitationData, error: invitationError } = await supabase
        .from('team_invitations')
        .select('*, teams!team_invitations_team_id_fkey(name)')
        .eq('token', token)
        .single();

      if (invitationError) throw invitationError;

      if (!invitationData) {
        setError('Invitation introuvable');
        return;
      }

      if (invitationData.status !== 'pending') {
        setError(`Cette invitation a déjà été ${invitationData.status === 'accepted' ? 'acceptée' : 'annulée'}`);
        return;
      }

      if (new Date(invitationData.expires_at) < new Date()) {
        setError('Cette invitation a expiré');
        return;
      }

      setInvitation(invitationData);
      setTeam(invitationData.teams);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Impossible de charger l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Rediriger vers l'authentification avec le token dans l'URL
      navigate(`/auth?invite=${token}`);
      return;
    }

    setAccepting(true);
    try {
      // Vérifier si l'utilisateur est déjà membre d'une team
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        toast({
          title: 'Erreur',
          description: 'Vous êtes déjà membre d\'une équipe',
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
              Vous devez vous connecter pour accepter cette invitation
            </p>
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
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Acceptation...
                </>
              ) : user ? (
                'Accepter'
              ) : (
                'Se connecter et accepter'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
