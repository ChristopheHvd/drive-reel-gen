import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { PLAN_CONFIGS, type PlanConfig } from '../types';
import { cn } from '@/lib/utils';

interface SubscriptionManagerProps {
  subscription: {
    plan_type: 'free' | 'starter' | 'pro' | 'business';
    videos_generated_this_month: number;
    video_limit: number;
    cancel_at_period_end?: boolean;
  };
  periodEndDate: string | null;
  isOwner: boolean;
  onOpenPortal: () => void;
  onChangePlan: (planType: 'starter' | 'pro' | 'business') => Promise<void>;
  isDowngrade: (planType: 'free' | 'starter' | 'pro' | 'business') => boolean;
  isUpgrade: (planType: 'free' | 'starter' | 'pro' | 'business') => boolean;
}

export const SubscriptionManager = ({
  subscription,
  periodEndDate,
  isOwner,
  onOpenPortal,
  onChangePlan,
  isDowngrade,
  isUpgrade,
}: SubscriptionManagerProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showDowngradeOptions, setShowDowngradeOptions] = useState(false);

  const currentPlan = PLAN_CONFIGS[subscription.plan_type];
  const isFree = subscription.plan_type === 'free';
  const isCanceled = subscription.cancel_at_period_end;

  const handleChangePlan = async (planType: 'starter' | 'pro' | 'business') => {
    try {
      setLoading(planType);
      await onChangePlan(planType);
    } finally {
      setLoading(null);
    }
  };

  // Options de downgrade disponibles
  const getDowngradeOptions = (): ('starter' | 'pro')[] => {
    switch (subscription.plan_type) {
      case 'business':
        return ['pro', 'starter'];
      case 'pro':
        return ['starter'];
      default:
        return [];
    }
  };

  const downgradeOptions = getDowngradeOptions();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Mon abonnement</CardTitle>
              <CardDescription>
                Gérez votre plan et votre facturation
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={isFree ? 'secondary' : 'default'}
            className={cn(
              "text-sm capitalize",
              !isFree && "bg-primary"
            )}
          >
            {currentPlan.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerte si annulation programmée */}
        {isCanceled && periodEndDate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Votre abonnement sera annulé le <strong>{periodEndDate}</strong>. 
              Vous passerez automatiquement au plan Gratuit.
            </AlertDescription>
          </Alert>
        )}

        {/* Infos du plan actuel */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Vidéos ce mois</p>
            <p className="font-semibold">
              {subscription.videos_generated_this_month} / {subscription.video_limit}
            </p>
          </div>
          {!isFree && periodEndDate && (
            <div>
              <p className="text-muted-foreground">
                {isCanceled ? 'Fin de l\'accès' : 'Prochain renouvellement'}
              </p>
              <p className="font-semibold">{periodEndDate}</p>
            </div>
          )}
        </div>

        {/* Options de downgrade pour les plans payants */}
        {!isFree && isOwner && downgradeOptions.length > 0 && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground"
              onClick={() => setShowDowngradeOptions(!showDowngradeOptions)}
            >
              <span>Changer de plan</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showDowngradeOptions && "rotate-180"
              )} />
            </Button>
            
            {showDowngradeOptions && (
              <div className="mt-2 space-y-2">
                {downgradeOptions.map((planType) => {
                  const plan = PLAN_CONFIGS[planType];
                  return (
                    <button
                      key={planType}
                      onClick={() => handleChangePlan(planType)}
                      disabled={loading !== null}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
                        "hover:border-primary/50 hover:bg-primary/5",
                        loading === planType && "opacity-50"
                      )}
                    >
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {plan.videoLimit} vidéos/mois
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{plan.price}€/mois</p>
                        <p className="text-xs text-amber-600">Effectif à la fin de période</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Actions */}
      {!isFree && isOwner && (
        <CardFooter className="flex-col gap-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onOpenPortal}
          >
            <ExternalLink className="w-4 h-4" />
            Gérer mon abonnement
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Annuler, changer de moyen de paiement, télécharger les factures
          </p>
        </CardFooter>
      )}
    </Card>
  );
};
