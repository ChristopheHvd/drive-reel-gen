import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TeamInvitation } from '../types';

export const useTeamInvitations = (teamId: string | null) => {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadInvitations = async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as TeamInvitation[]);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();

    // Subscribe to realtime changes
    if (!teamId) return;

    const channel = supabase
      .channel('team-invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invitations',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          loadInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const sendInvitation = async (email: string, role: 'admin' | 'member') => {
    if (!teamId) {
      toast({
        title: 'Erreur',
        description: 'Aucune équipe sélectionnée',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { teamId, email, role },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Erreur',
          description: data.error,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été envoyée à ${email}`,
      });

      return data.invitation;
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'invitation",
        variant: 'destructive',
      });
      return null;
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation annulée',
        description: "L'invitation a été annulée avec succès",
      });

      loadInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'annuler l'invitation",
        variant: 'destructive',
      });
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      // Récupérer les détails de l'invitation
      const invitation = invitations.find((inv) => inv.id === invitationId);
      if (!invitation) throw new Error('Invitation non trouvée');

      // Créer une nouvelle invitation avec les mêmes détails
      // Si le rôle est "owner", on le convertit en "admin" car on ne peut pas inviter en tant que owner
      const roleToInvite = invitation.role === 'owner' ? 'admin' : invitation.role;
      const result = await sendInvitation(invitation.email, roleToInvite);

      if (result) {
        // Annuler l'ancienne invitation
        await cancelInvitation(invitationId);
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de renvoyer l'invitation",
        variant: 'destructive',
      });
    }
  };

  return {
    invitations,
    loading,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    refresh: loadInvitations,
  };
};
