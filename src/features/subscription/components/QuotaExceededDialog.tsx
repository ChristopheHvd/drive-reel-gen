import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlanCard } from './PlanCard';
import { PLAN_CONFIGS } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuotaExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextResetDate: string;
  currentPlan: 'free' | 'starter' | 'pro' | 'business';
}

export const QuotaExceededDialog = ({
  open,
  onOpenChange,
  nextResetDate,
  currentPlan,
}: QuotaExceededDialogProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planType: 'starter' | 'pro' | 'business') => {
    try {
      setLoading(planType);
      const plan = PLAN_CONFIGS[planType];

      if (!plan.stripePriceId) {
        toast({
          title: 'Configuration manquante',
          description: 'Les plans Stripe ne sont pas encore configurés. Contactez le support.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripePriceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la session de paiement.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const getMessage = () => {
    if (currentPlan === 'free') {
      return `Vous avez utilisé vos ${PLAN_CONFIGS.free.videoLimit} vidéos gratuites ce mois-ci.`;
    }
    if (currentPlan === 'starter') {
      return `Vous avez utilisé vos ${PLAN_CONFIGS.starter.videoLimit} vidéos du plan Starter ce mois-ci.`;
    }
    if (currentPlan === 'pro') {
      return 'Votre quota mensuel est atteint (plan Pro).';
    }
    return 'Votre quota mensuel est atteint.';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Quota mensuel atteint 😅</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {getMessage()}
            <br />
            Votre quota sera réinitialisé le <strong>{nextResetDate}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
          <PlanCard
            plan={PLAN_CONFIGS.free}
            isCurrentPlan={currentPlan === 'free'}
          />
          <PlanCard
            plan={PLAN_CONFIGS.starter}
            isCurrentPlan={currentPlan === 'starter'}
            onSubscribe={() => handleSubscribe('starter')}
            loading={loading === 'starter'}
          />
          <PlanCard
            plan={PLAN_CONFIGS.pro}
            isCurrentPlan={currentPlan === 'pro'}
            onSubscribe={() => handleSubscribe('pro')}
            loading={loading === 'pro'}
          />
          <PlanCard
            plan={PLAN_CONFIGS.business}
            isCurrentPlan={currentPlan === 'business'}
            onSubscribe={() => handleSubscribe('business')}
            loading={loading === 'business'}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
