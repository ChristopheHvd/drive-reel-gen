import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('useAuth - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null user and loading true', () => {
    const mockSubscription = { unsubscribe: vi.fn() };
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: mockSubscription },
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should set user when session exists', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };
    
    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };

    const mockSubscription = { unsubscribe: vi.fn() };
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: mockSubscription },
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession },
    });

    const { result } = renderHook(() => useAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it('should call signInWithOAuth when signInWithGoogle is called', async () => {
    const mockSubscription = { unsubscribe: vi.fn() };
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: mockSubscription },
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          scopes: expect.stringContaining('drive.readonly'),
        }),
      })
    );
  });

  it('should handle sign out correctly', async () => {
    const mockSubscription = { unsubscribe: vi.fn() };
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: mockSubscription },
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
