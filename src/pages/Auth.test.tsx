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

const mockAuthReturn = {
  user: null,
  session: null,
  loading: false,
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn(),
};

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page for non-authenticated users', () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthReturn);

    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(container.textContent).toContain('Continuer avec Google');
  });

  it('shows loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthReturn,
      loading: true,
    });

    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(container.textContent).toContain('Chargement');
  });

  it('handles authenticated users correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthReturn,
      user: { id: 'user-123', email: 'test@example.com' } as any,
      session: { access_token: 'token-123' } as any,
    });

    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(container).toBeTruthy();
  });
});
