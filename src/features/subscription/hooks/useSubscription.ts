import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Subscription } from '../types';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
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
          // Mettre à jour le state si c'est bien la mise à jour de l'abonnement
          if (payload.new) {
            setSubscription(payload.new as Subscription);
            setError(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    refresh: loadSubscription,
  };
};
