import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from './Auth';
import { useAuth } from '@/features/auth';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page for non-authenticated users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(container.textContent).toContain('Continuer avec Google');
  });

  it('shows loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(container.textContent).toContain('Chargement');
  });

  it('does NOT call save-drive-token (regression test)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' } as any,
      session: { access_token: 'token-123' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { has_completed_onboarding: false },
            error: null,
          }),
        })),
      })),
    } as any);

    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Wait for useEffect
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify save-drive-token is NOT called
    expect(supabase.functions.invoke).not.toHaveBeenCalledWith(
      'save-drive-token',
      expect.any(Object)
    );
  });

  it('handles authenticated users correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' } as any,
      session: { access_token: 'token-123' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Component renders without crash
    expect(container).toBeTruthy();
  });
});
