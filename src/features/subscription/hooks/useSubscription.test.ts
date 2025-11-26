import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubscription } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('useSubscription', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockSubscription = {
    id: 'sub-1',
    user_id: 'test-user-id',
    team_id: 'team-1',
    plan_type: 'pro',
    video_limit: 50,
    videos_generated_this_month: 25,
    current_period_end: '2025-12-31T00:00:00Z',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    stripe_price_id: 'price_123',
  };

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
  });

  it('should initialize with null subscription and loading true', () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => new Promise(() => {})),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubscription());

    expect(result.current.subscription).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should load subscription data successfully', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.error).toBeNull();
  });

  it('should calculate videosRemaining correctly', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.videosRemaining).toBe(25); // 50 - 25
  });

  it('should set isQuotaExceeded to true when limit reached', async () => {
    const exhaustedSubscription = {
      ...mockSubscription,
      videos_generated_this_month: 50,
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: exhaustedSubscription,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isQuotaExceeded).toBe(true);
  });

  it('should calculate nextResetDate correctly', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const expectedDate = nextMonth.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    expect(result.current.nextResetDate).toBe(expectedDate);
  });

  it('should handle subscription fetch error', async () => {
    const mockError = new Error('Failed to fetch');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.subscription).toBeNull();
  });

  it('should setup realtime subscription channel', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      }),
    } as any);

    renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith('subscription-changes');
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_subscriptions',
      },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should cleanup channel on unmount', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      }),
    } as any);

    const { unmount } = renderHook(() => useSubscription());

    await vi.waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
