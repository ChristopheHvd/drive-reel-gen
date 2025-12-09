import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByText(/continuer avec google/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthReturn,
      loading: true,
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
  });

  it('handles authenticated users correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthReturn,
      user: { id: 'user-123', email: 'test@example.com' } as any,
      session: { access_token: 'token-123' } as any,
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });

  describe('Invitation Flow', () => {
    it('shows invitation message when invite token is present', () => {
      vi.mocked(useAuth).mockReturnValue(mockAuthReturn);

      render(
        <MemoryRouter initialEntries={['/auth?invite=abc123']}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.getByText(/rejoindre une équipe/i)).toBeInTheDocument();
    });

    it('pre-fills email and shows contextual message when email param is present', () => {
      vi.mocked(useAuth).mockReturnValue(mockAuthReturn);

      render(
        <MemoryRouter initialEntries={['/auth?invite=abc123&email=invited%40example.com']}>
          <Auth />
        </MemoryRouter>
      );

      // Should show contextual invitation message
      expect(screen.getByText(/invitation envoyée à/i)).toBeInTheDocument();
      expect(screen.getByText(/invited@example.com/i)).toBeInTheDocument();
    });

    it('defaults to signup tab when email is pre-filled from invitation', () => {
      vi.mocked(useAuth).mockReturnValue(mockAuthReturn);

      render(
        <MemoryRouter initialEntries={['/auth?invite=abc123&email=invited%40example.com']}>
          <Auth />
        </MemoryRouter>
      );

      // Signup tab should be active (check for signup-specific elements)
      expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument();
    });

    it('defaults to login tab when no email is pre-filled', () => {
      vi.mocked(useAuth).mockReturnValue(mockAuthReturn);

      render(
        <MemoryRouter initialEntries={['/auth']}>
          <Auth />
        </MemoryRouter>
      );

      // Login tab should be active (no full name field visible by default)
      expect(screen.queryByLabelText(/nom complet/i)).not.toBeInTheDocument();
    });

    it('redirects authenticated user to invite page with token', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthReturn,
        user: { id: 'user-123', email: 'test@example.com' } as any,
        session: { access_token: 'token-123' } as any,
      });

      render(
        <MemoryRouter initialEntries={['/auth?invite=abc123']}>
          <Auth />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/invite?token=abc123');
    });
  });
});
