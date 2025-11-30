import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCurrentTeam = () => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Récupérer la subscription qui contient le team_id
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        setTeamId(subscription?.team_id || null);
      } catch (error) {
        console.error('Error loading team:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, []);

  return { teamId, loading };
};
