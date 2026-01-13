import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Subscription } from '../types';
import { PLAN_HIERARCHY } from '../types';
import { useToast } from '@/hooks/use-toast';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const { toast } = useToast();

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

  /**
   * Ouvre le portail client Stripe pour gérer l'abonnement
   */
  const openCustomerPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening customer portal:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir le portail de gestion.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Change le plan de l'abonnement (upgrade ou downgrade)
   */
  const changePlan = useCallback(async (newPlanType: 'starter' | 'pro' | 'business') => {
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { newPlanType },
      });
      
      if (error) throw error;
      
      if (data?.isDowngrade) {
        toast({
          title: 'Changement programmé',
          description: `Votre passage à ${newPlanType} sera effectif à la fin de votre période actuelle.`,
        });
      } else {
        toast({
          title: 'Plan mis à jour',
          description: `Vous êtes maintenant sur le plan ${newPlanType}.`,
        });
      }
      
      // Recharger la subscription
      await loadSubscription();
      
      return data;
    } catch (err) {
      console.error('Error changing plan:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de changer de plan.',
        variant: 'destructive',
      });
      throw err;
    }
  }, [toast]);

  /**
   * Vérifie si un plan donné serait un downgrade par rapport au plan actuel
   */
  const isDowngrade = useCallback((targetPlan: 'free' | 'starter' | 'pro' | 'business') => {
    if (!subscription) return false;
    const currentIndex = PLAN_HIERARCHY.indexOf(subscription.plan_type);
    const targetIndex = PLAN_HIERARCHY.indexOf(targetPlan);
    return targetIndex < currentIndex;
  }, [subscription]);

  /**
   * Vérifie si un plan donné serait un upgrade par rapport au plan actuel
   */
  const isUpgrade = useCallback((targetPlan: 'free' | 'starter' | 'pro' | 'business') => {
    if (!subscription) return false;
    const currentIndex = PLAN_HIERARCHY.indexOf(subscription.plan_type);
    const targetIndex = PLAN_HIERARCHY.indexOf(targetPlan);
    return targetIndex > currentIndex;
  }, [subscription]);

  const videosRemaining = subscription
    ? Math.max(0, subscription.video_limit - subscription.videos_generated_this_month)
    : 0;

  const isQuotaExceeded = subscription
    ? subscription.videos_generated_this_month >= subscription.video_limit
    : false;

  const isCanceled = subscription?.cancel_at_period_end ?? false;

  const nextResetDate = getNextResetDate();

  const periodEndDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return {
    subscription,
    loading,
    error,
    videosRemaining,
    isQuotaExceeded,
    nextResetDate,
    isOwner,
    isCanceled,
    periodEndDate,
    refresh: loadSubscription,
    openCustomerPortal,
    changePlan,
    isDowngrade,
    isUpgrade,
  };
};
