import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotaExceededDialog } from './QuotaExceededDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

describe('QuotaExceededDialog', () => {
  const mockToast = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
    global.open = vi.fn();
  });

  it('should display correct message for free plan', () => {
    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    expect(container).toHaveTextContent('Vous avez utilisé vos 6 vidéos gratuites ce mois-ci');
    expect(container).toHaveTextContent('Votre quota sera réinitialisé le');
    expect(container).toHaveTextContent('1 janvier 2026');
  });

  it('should display correct message for pro plan', () => {
    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="pro"
      />
    );

    expect(container).toHaveTextContent('Vous avez utilisé vos 50 vidéos du plan Pro ce mois-ci');
  });

  it('should render all three plan cards', () => {
    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    expect(container).toHaveTextContent('Free');
    expect(container).toHaveTextContent('Pro');
    expect(container).toHaveTextContent('Business');
  });

  it('should mark current plan correctly', () => {
    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="pro"
      />
    );

    expect(container).toHaveTextContent('Votre plan');
  });

  it('should call create-checkout when subscribing to Pro', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/session-123' },
      error: null,
    } as any);

    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const buttons = Array.from(container.querySelectorAll('button')).filter(
      (btn) => (btn as HTMLButtonElement).textContent === "S'abonner"
    );
    const proButton = buttons[0] as HTMLButtonElement;
    
    await user.click(proButton);

    await vi.waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-checkout', {
        body: { priceId: 'price_1SSfSJBlI68zgCmzWM3uPZIu' },
      });
    });

    expect(global.open).toHaveBeenCalledWith('https://checkout.stripe.com/session-123', '_blank');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should handle subscription error gracefully', async () => {
    const user = userEvent.setup();
    const error = new Error('Payment failed');
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error,
    } as any);

    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const buttons = Array.from(container.querySelectorAll('button')).filter(
      (btn) => (btn as HTMLButtonElement).textContent === "S'abonner"
    );
    const proButton = buttons[0] as HTMLButtonElement;
    
    await user.click(proButton);

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Impossible de créer la session de paiement.',
        variant: 'destructive',
      });
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it('should close dialog when Fermer button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const closeButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => (btn as HTMLButtonElement).textContent === 'Fermer'
    ) as HTMLButtonElement;
    
    await user.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show loading state when subscribing', async () => {
    const user = userEvent.setup();
    let resolvePromise: any;
    vi.mocked(supabase.functions.invoke).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }) as any
    );

    const { container } = render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const buttons = Array.from(container.querySelectorAll('button')).filter(
      (btn) => (btn as HTMLButtonElement).textContent === "S'abonner"
    );
    const proButton = buttons[0] as HTMLButtonElement;
    
    await user.click(proButton);

    await vi.waitFor(() => {
      expect(container).toHaveTextContent('Chargement...');
    });

    resolvePromise({ data: { url: 'test' }, error: null });
  });
});
