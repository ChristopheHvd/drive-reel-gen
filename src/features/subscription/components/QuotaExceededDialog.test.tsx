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
    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    expect(document.body).toHaveTextContent('Vous avez utilisé vos 6 vidéos gratuites ce mois-ci');
    expect(document.body).toHaveTextContent('Votre quota sera réinitialisé le');
    expect(document.body).toHaveTextContent('1 janvier 2026');
  });

  it('should display correct message for pro plan', () => {
    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="pro"
      />
    );

    expect(document.body).toHaveTextContent('Vous avez utilisé vos 50 vidéos du plan Pro ce mois-ci');
  });

  it('should render all three plan cards', () => {
    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    expect(document.body).toHaveTextContent('Free');
    expect(document.body).toHaveTextContent('Pro');
    expect(document.body).toHaveTextContent('Business');
  });

  it('should mark current plan correctly', () => {
    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="pro"
      />
    );

    expect(document.body).toHaveTextContent('Votre plan');
  });

  it('should call create-checkout when subscribing to Pro', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/session-123' },
      error: null,
    } as any);

    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const buttons = Array.from(document.querySelectorAll('button')).filter(
      (btn) => btn.textContent === "S'abonner"
    );
    const proButton = buttons[0];
    
    await user.click(proButton);

    await vi.waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-checkout', {
        body: { priceId: 'price_1SSexRBlI68zgCmz0DNoBAha' },
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

    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const buttons = Array.from(document.querySelectorAll('button')).filter(
      (btn) => btn.textContent === "S'abonner"
    );
    const proButton = buttons[0];
    
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
    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const closeButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Fermer'
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

    render(
      <QuotaExceededDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        nextResetDate="1 janvier 2026"
        currentPlan="free"
      />
    );

    const buttons = Array.from(document.querySelectorAll('button')).filter(
      (btn) => btn.textContent === "S'abonner"
    );
    const proButton = buttons[0];
    
    await user.click(proButton);

    await vi.waitFor(() => {
      expect(document.body).toHaveTextContent('Chargement...');
    });

    resolvePromise({ data: { url: 'test' }, error: null });
  });
});
