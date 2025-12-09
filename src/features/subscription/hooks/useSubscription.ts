import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Subscription } from '../types';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // 1. Récupérer le team_id de l'utilisateur via team_members
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .single();

      if (teamError) throw teamError;
      if (!teamMember) throw new Error('User is not part of any team');

      setTeamId(teamMember.team_id);
      setIsOwner(teamMember.role === 'owner');

      // 2. Récupérer la subscription de l'équipe
      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .single();

      if (fetchError) throw fetchError;
      
      setSubscription(data as Subscription);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();

    // Écouter les changements realtime sur l'abonnement
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_subscriptions',
        },
        (payload) => {
          // Mettre à jour le state si c'est la subscription de notre équipe
          if (payload.new && teamId && (payload.new as Subscription).team_id === teamId) {
            setSubscription(payload.new as Subscription);
            setError(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const getNextResetDate = (): string => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const videosRemaining = subscription
    ? Math.max(0, subscription.video_limit - subscription.videos_generated_this_month)
    : 0;

  const isQuotaExceeded = subscription
    ? subscription.videos_generated_this_month >= subscription.video_limit
    : false;

  const nextResetDate = getNextResetDate();

  return {
    subscription,
    loading,
    error,
    videosRemaining,
    isQuotaExceeded,
    nextResetDate,
    isOwner,
    refresh: loadSubscription,
  };
};
