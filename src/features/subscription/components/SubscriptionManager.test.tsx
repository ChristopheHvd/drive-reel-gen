import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubscriptionManager } from './SubscriptionManager';

// Mock PLAN_CONFIGS
vi.mock('../types', () => ({
  PLAN_CONFIGS: {
    free: { name: 'Gratuit', videoLimit: 5, price: 0 },
    starter: { name: 'Starter', videoLimit: 20, price: 9 },
    pro: { name: 'Pro', videoLimit: 60, price: 29 },
    business: { name: 'Business', videoLimit: 200, price: 99 },
  },
}));

describe('SubscriptionManager', () => {
  const defaultProps = {
    subscription: {
      plan_type: 'pro' as const,
      videos_generated_this_month: 25,
      video_limit: 60,
      cancel_at_period_end: false,
    },
    periodEndDate: '15 janvier 2026',
    isOwner: true,
    onOpenPortal: vi.fn(),
    onChangePlan: vi.fn().mockResolvedValue(undefined),
    isDowngrade: vi.fn((plan) => ['free', 'starter'].includes(plan)),
    isUpgrade: vi.fn((plan) => plan === 'business'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should display current plan name and badge', () => {
      render(<SubscriptionManager {...defaultProps} />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Mon abonnement')).toBeInTheDocument();
    });

    it('should show videos count (used / limit)', () => {
      render(<SubscriptionManager {...defaultProps} />);

      expect(screen.getByText('25 / 60')).toBeInTheDocument();
      expect(screen.getByText('Vidéos ce mois')).toBeInTheDocument();
    });

    it('should display period end date for paid plans', () => {
      render(<SubscriptionManager {...defaultProps} />);

      expect(screen.getByText('15 janvier 2026')).toBeInTheDocument();
      expect(screen.getByText('Prochain renouvellement')).toBeInTheDocument();
    });

    it('should not show period end date for free plan', () => {
      const freeProps = {
        ...defaultProps,
        subscription: {
          ...defaultProps.subscription,
          plan_type: 'free' as const,
          video_limit: 5,
        },
        periodEndDate: null,
      };

      render(<SubscriptionManager {...freeProps} />);

      expect(screen.queryByText('Prochain renouvellement')).not.toBeInTheDocument();
    });
  });

  describe('Cancellation alert', () => {
    it('should show cancellation alert when cancel_at_period_end is true', () => {
      const canceledProps = {
        ...defaultProps,
        subscription: {
          ...defaultProps.subscription,
          cancel_at_period_end: true,
        },
      };

      render(<SubscriptionManager {...canceledProps} />);

      expect(screen.getByText(/Votre abonnement sera annulé le/)).toBeInTheDocument();
      expect(screen.getByText(/15 janvier 2026/)).toBeInTheDocument();
      expect(screen.getByText(/Vous passerez automatiquement au plan Gratuit/)).toBeInTheDocument();
    });

    it('should not show cancellation alert when cancel_at_period_end is false', () => {
      render(<SubscriptionManager {...defaultProps} />);

      expect(screen.queryByText(/Votre abonnement sera annulé/)).not.toBeInTheDocument();
    });

    it('should show "Fin de l\'accès" instead of "Prochain renouvellement" when canceled', () => {
      const canceledProps = {
        ...defaultProps,
        subscription: {
          ...defaultProps.subscription,
          cancel_at_period_end: true,
        },
      };

      render(<SubscriptionManager {...canceledProps} />);

      expect(screen.getByText("Fin de l'accès")).toBeInTheDocument();
      expect(screen.queryByText('Prochain renouvellement')).not.toBeInTheDocument();
    });
  });

  describe('Downgrade options', () => {
    it('should show downgrade button for Pro plan', () => {
      render(<SubscriptionManager {...defaultProps} />);

      expect(screen.getByText('Changer de plan')).toBeInTheDocument();
    });

    it('should show both downgrade options for Business plan', () => {
      const businessProps = {
        ...defaultProps,
        subscription: {
          ...defaultProps.subscription,
          plan_type: 'business' as const,
          video_limit: 200,
        },
      };

      render(<SubscriptionManager {...businessProps} />);
      
      // Toggle downgrade options
      fireEvent.click(screen.getByText('Changer de plan'));

      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('60 vidéos/mois')).toBeInTheDocument();
      expect(screen.getByText('20 vidéos/mois')).toBeInTheDocument();
    });

    it('should show one downgrade option for Pro plan', () => {
      render(<SubscriptionManager {...defaultProps} />);
      
      // Toggle downgrade options
      fireEvent.click(screen.getByText('Changer de plan'));

      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('20 vidéos/mois')).toBeInTheDocument();
    });

    it('should not show downgrade options for Free plan', () => {
      const freeProps = {
        ...defaultProps,
        subscription: {
          ...defaultProps.subscription,
          plan_type: 'free' as const,
          video_limit: 5,
        },
        periodEndDate: null,
      };

      render(<SubscriptionManager {...freeProps} />);

      expect(screen.queryByText('Changer de plan')).not.toBeInTheDocument();
    });

    it('should not show downgrade options for Starter plan', () => {
      const starterProps = {
        ...defaultProps,
        subscription: {
          ...defaultProps.subscription,
          plan_type: 'starter' as const,
          video_limit: 20,
        },
      };

      render(<SubscriptionManager {...starterProps} />);

      expect(screen.queryByText('Changer de plan')).not.toBeInTheDocument();
    });

    it('should toggle downgrade options on button click', () => {
      render(<SubscriptionManager {...defaultProps} />);
      
      // Initially hidden
      expect(screen.queryByText('20 vidéos/mois')).not.toBeInTheDocument();
      
      // Click to show
      fireEvent.click(screen.getByText('Changer de plan'));
      expect(screen.getByText('20 vidéos/mois')).toBeInTheDocument();
      
      // Click to hide
      fireEvent.click(screen.getByText('Changer de plan'));
      expect(screen.queryByText('20 vidéos/mois')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onChangePlan with correct plan type when downgrade selected', async () => {
      render(<SubscriptionManager {...defaultProps} />);
      
      // Toggle downgrade options
      fireEvent.click(screen.getByText('Changer de plan'));
      
      // Click on Starter option
      fireEvent.click(screen.getByText('Starter'));

      await waitFor(() => {
        expect(defaultProps.onChangePlan).toHaveBeenCalledWith('starter');
      });
    });

    it('should call onOpenPortal when manage button clicked', () => {
      render(<SubscriptionManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Gérer mon abonnement'));

      expect(defaultProps.onOpenPortal).toHaveBeenCalled();
    });

    it('should disable buttons while loading', async () => {
      const slowChangePlan = vi.fn((): Promise<void> => new Promise(() => {})); // Never resolves
      const props = {
        ...defaultProps,
        onChangePlan: slowChangePlan,
      };

      render(<SubscriptionManager {...props} />);
      
      // Toggle downgrade options
      fireEvent.click(screen.getByText('Changer de plan'));
      
      // Click on Starter option
      const starterButton = screen.getByText('Starter').closest('button');
      fireEvent.click(starterButton!);

      await waitFor(() => {
        expect(starterButton).toHaveClass('opacity-50');
      });
    });
  });

  describe('Owner permissions', () => {
    it('should show manage button only for owners', () => {
      render(<SubscriptionManager {...defaultProps} />);

      expect(screen.getByText('Gérer mon abonnement')).toBeInTheDocument();
    });

    it('should hide manage button for non-owners', () => {
      const nonOwnerProps = {
        ...defaultProps,
        isOwner: false,
      };

      render(<SubscriptionManager {...nonOwnerProps} />);

      expect(screen.queryByText('Gérer mon abonnement')).not.toBeInTheDocument();
    });

    it('should hide downgrade options for non-owners', () => {
      const nonOwnerProps = {
        ...defaultProps,
        isOwner: false,
      };

      render(<SubscriptionManager {...nonOwnerProps} />);

      expect(screen.queryByText('Changer de plan')).not.toBeInTheDocument();
    });
  });
});
