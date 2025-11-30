import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TeamMember } from '../types';

export const useTeamMembers = (teamId: string | null) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const { toast } = useToast();

  const loadMembers = async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Charger les membres
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Charger les profils pour chaque membre
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const membersWithProfiles = membersData.map(member => ({
        ...member,
        user_profiles: profilesData?.find(p => p.user_id === member.user_id) || {
          email: '',
          full_name: null,
          avatar_url: null,
        },
      }));

      setMembers(membersWithProfiles as TeamMember[]);

      // Trouver le rôle de l'utilisateur actuel
      const currentMember = membersWithProfiles?.find((m) => m.user_id === user?.id);
      setCurrentUserRole(currentMember?.role || null);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les membres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();

    // Subscribe to realtime changes
    if (!teamId) return;

    const channel = supabase
      .channel('team-members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Rôle modifié',
        description: 'Le rôle du membre a été modifié avec succès',
      });

      loadMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le rôle',
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Membre retiré',
        description: "Le membre a été retiré de l'équipe",
      });

      loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le membre',
        variant: 'destructive',
      });
    }
  };

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  return {
    members,
    loading,
    currentUserRole,
    canManageMembers,
    updateMemberRole,
    removeMember,
    refresh: loadMembers,
  };
};
