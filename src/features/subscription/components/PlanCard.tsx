import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlanConfig } from '../types';

interface PlanCardProps {
  plan: PlanConfig;
  isCurrentPlan?: boolean;
  onSubscribe?: () => void;
  loading?: boolean;
}

export const PlanCard = ({ plan, isCurrentPlan, onSubscribe, loading }: PlanCardProps) => {
  return (
    <Card className={`relative ${plan.isPopular ? 'border-primary shadow-lg' : ''}`}>
      {plan.isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Populaire
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary">
          Votre plan
        </Badge>
      )}
      
      <CardHeader className="text-center pb-8 pt-6">
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-4xl font-bold mt-4">
          {plan.price === 0 ? (
            'Gratuit'
          ) : (
            <>
              {plan.price}€
              <span className="text-base font-normal text-muted-foreground">/mois</span>
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold">
            {typeof plan.videoLimit === 'number' ? `${plan.videoLimit} vidéos` : 'Vidéos illimitées'}
          </p>
          <p className="text-xs text-muted-foreground">par mois</p>
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {!isCurrentPlan && onSubscribe && plan.price > 0 && (
          <Button
            onClick={onSubscribe}
            disabled={loading}
            className="w-full"
            variant={plan.isPopular ? 'default' : 'outline'}
          >
            {loading ? 'Chargement...' : 'S\'abonner'}
          </Button>
        )}
        {isCurrentPlan && (
          <Button disabled className="w-full" variant="outline">
            Plan actuel
          </Button>
        )}
        {!isCurrentPlan && plan.price === 0 && (
          <Button disabled className="w-full" variant="outline">
            Plan gratuit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
