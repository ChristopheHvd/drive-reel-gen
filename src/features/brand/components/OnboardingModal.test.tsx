import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingModal } from './OnboardingModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { name: 'Test Team' }, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
  }
}));

// Mock useCurrentTeam
vi.mock('@/features/team', () => ({
  useCurrentTeam: () => ({ teamId: 'test-team-id' })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('OnboardingModal', () => {
  it('should display "Le faire plus tard" button instead of "Passer cette étape"', () => {
    render(
      <OnboardingModal 
        open={true} 
        onOpenChange={vi.fn()} 
        onComplete={vi.fn()} 
      />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByText('Le faire plus tard')).toBeInTheDocument();
    expect(screen.queryByText('Passer cette étape')).not.toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(
      <OnboardingModal 
        open={true} 
        onOpenChange={vi.fn()} 
        onComplete={vi.fn()} 
      />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByLabelText(/Nom de l'entreprise/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Site web/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instagram/i)).toBeInTheDocument();
  });

  it('should have Continuer button', () => {
    render(
      <OnboardingModal 
        open={true} 
        onOpenChange={vi.fn()} 
        onComplete={vi.fn()} 
      />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByRole('button', { name: /Continuer/i })).toBeInTheDocument();
  });
});
