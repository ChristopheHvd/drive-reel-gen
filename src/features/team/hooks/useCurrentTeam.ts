import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
}

export const useCurrentTeam = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeam = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Récupérer le team_id via team_members
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        setLoading(false);
        return;
      }

      // Récupérer les infos de l'équipe (id + name)
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamMember.team_id)
        .single();

      setTeam(teamData || null);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeamName = useCallback(async (newName: string) => {
    if (!team) return;

    const { error } = await supabase
      .from('teams')
      .update({ name: newName })
      .eq('id', team.id);

    if (error) {
      console.error('Error updating team name:', error);
      throw error;
    }

    setTeam(prev => prev ? { ...prev, name: newName } : null);
  }, [team]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  return { 
    team,
    teamId: team?.id || null, 
    teamName: team?.name || null,
    loading, 
    updateTeamName,
    reloadTeam: loadTeam
  };
};
