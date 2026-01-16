import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useSubscription', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockTeamMember = {
    team_id: 'team-1',
    role: 'owner',
  };
  const mockSubscription = {
    id: 'sub-1',
    user_id: 'owner-user-id',
    team_id: 'team-1',
    plan_type: 'pro',
    video_limit: 50,
    videos_generated_this_month: 25,
    current_period_end: '2025-12-31T00:00:00Z',
    cancel_at_period_end: false,
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    stripe_price_id: 'price_123',
  };

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  const setupMocks = (teamMemberData: any, subscriptionData: any) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: teamMemberData,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'user_subscriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: subscriptionData,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });
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
    expect(result.current.isOwner).toBe(false);
  });

  it('should load team subscription data successfully', async () => {
    setupMocks(mockTeamMember, mockSubscription);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.error).toBeNull();
    expect(result.current.isOwner).toBe(true);
  });

  it('should set isOwner to false for team members', async () => {
    const memberTeamMember = { ...mockTeamMember, role: 'member' };
    setupMocks(memberTeamMember, mockSubscription);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
    expect(result.current.subscription).toEqual(mockSubscription);
  });

  it('should set isOwner to false for team admins', async () => {
    const adminTeamMember = { ...mockTeamMember, role: 'admin' };
    setupMocks(adminTeamMember, mockSubscription);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
  });

  it('should calculate videosRemaining correctly from team subscription', async () => {
    setupMocks(mockTeamMember, mockSubscription);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.videosRemaining).toBe(25); // 50 - 25
  });

  it('should set isQuotaExceeded to true when team limit reached', async () => {
    const exhaustedSubscription = {
      ...mockSubscription,
      videos_generated_this_month: 50,
    };
    setupMocks(mockTeamMember, exhaustedSubscription);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isQuotaExceeded).toBe(true);
  });

  it('should calculate nextResetDate correctly', async () => {
    setupMocks(mockTeamMember, mockSubscription);

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
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

  it('should handle team member fetch error', async () => {
    const mockError = new Error('Failed to fetch team');
    
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

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.subscription).toBeNull();
  });

  it('should setup realtime subscription channel', async () => {
    setupMocks(mockTeamMember, mockSubscription);

    renderHook(() => useSubscription());

    await waitFor(() => {
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
    setupMocks(mockTeamMember, mockSubscription);

    const { unmount } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should fetch subscription by team_id not user_id', async () => {
    setupMocks(mockTeamMember, mockSubscription);

    renderHook(() => useSubscription());

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('team_members');
      expect(supabase.from).toHaveBeenCalledWith('user_subscriptions');
    });
  });

  describe('Team members sharing subscription', () => {
    it('should show same subscription for owner and invited member', async () => {
      // Owner fetches subscription
      setupMocks({ team_id: 'team-1', role: 'owner' }, mockSubscription);
      const { result: ownerResult } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(ownerResult.current.loading).toBe(false);
      });

      // Member fetches same team subscription
      setupMocks({ team_id: 'team-1', role: 'member' }, mockSubscription);
      const { result: memberResult } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(memberResult.current.loading).toBe(false);
      });

      // Both should see the same subscription
      expect(ownerResult.current.subscription?.plan_type).toBe('pro');
      expect(memberResult.current.subscription?.plan_type).toBe('pro');
      expect(ownerResult.current.videosRemaining).toBe(memberResult.current.videosRemaining);
    });
  });

  describe('isCanceled', () => {
    it('should return isCanceled true when cancel_at_period_end is true', async () => {
      const canceledSubscription = { ...mockSubscription, cancel_at_period_end: true };
      setupMocks(mockTeamMember, canceledSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isCanceled).toBe(true);
    });

    it('should return isCanceled false when cancel_at_period_end is false', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isCanceled).toBe(false);
    });

    it('should return isCanceled false when cancel_at_period_end is undefined', async () => {
      const subWithoutCancel = { ...mockSubscription };
      delete (subWithoutCancel as any).cancel_at_period_end;
      setupMocks(mockTeamMember, subWithoutCancel);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isCanceled).toBe(false);
    });
  });

  describe('periodEndDate', () => {
    it('should format periodEndDate in French locale', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should be formatted in French
      expect(result.current.periodEndDate).toMatch(/\d{1,2}\s+\w+\s+\d{4}/);
    });

    it('should return null when current_period_end is null', async () => {
      const subWithoutPeriodEnd = { ...mockSubscription, current_period_end: null };
      setupMocks(mockTeamMember, subWithoutPeriodEnd);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.periodEndDate).toBeNull();
    });
  });

  describe('isDowngrade', () => {
    it('should return true when target plan is lower (pro → starter)', async () => {
      setupMocks(mockTeamMember, mockSubscription); // plan_type: 'pro'

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDowngrade('starter')).toBe(true);
    });

    it('should return true when target plan is lower (pro → free)', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDowngrade('free')).toBe(true);
    });

    it('should return false when target plan is same', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDowngrade('pro')).toBe(false);
    });

    it('should return false when target plan is higher', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDowngrade('business')).toBe(false);
    });

    it('should return false when no subscription', async () => {
      setupMocks(mockTeamMember, null);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDowngrade('starter')).toBe(false);
    });
  });

  describe('isUpgrade', () => {
    it('should return true when target plan is higher (pro → business)', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUpgrade('business')).toBe(true);
    });

    it('should return false when target plan is same', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUpgrade('pro')).toBe(false);
    });

    it('should return false when target plan is lower', async () => {
      setupMocks(mockTeamMember, mockSubscription);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUpgrade('starter')).toBe(false);
    });

    it('should return false when no subscription', async () => {
      setupMocks(mockTeamMember, null);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUpgrade('business')).toBe(false);
    });
  });

  describe('changePlan', () => {
    beforeEach(() => {
      (supabase as any).functions = {
        invoke: vi.fn(),
      };
    });

    it('should call update-subscription edge function', async () => {
      setupMocks(mockTeamMember, mockSubscription);
      vi.mocked((supabase as any).functions.invoke).mockResolvedValue({
        data: { success: true, isDowngrade: false, newPlan: 'business' },
        error: null,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.changePlan('business');

      expect((supabase as any).functions.invoke).toHaveBeenCalledWith('update-subscription', {
        body: { newPlanType: 'business' },
      });
    });

    it('should return data after successful plan change', async () => {
      setupMocks(mockTeamMember, mockSubscription);
      const mockResponse = { success: true, isDowngrade: true, newPlan: 'starter' };
      vi.mocked((supabase as any).functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.changePlan('starter');

      expect(response).toEqual(mockResponse);
    });

    it('should throw error on failure', async () => {
      setupMocks(mockTeamMember, mockSubscription);
      vi.mocked((supabase as any).functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Plan change failed'),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.changePlan('business')).rejects.toThrow();
    });
  });

  describe('openCustomerPortal', () => {
    const mockOpen = vi.fn();

    beforeEach(() => {
      (supabase as any).functions = {
        invoke: vi.fn(),
      };
      vi.stubGlobal('open', mockOpen);
    });

    it('should call customer-portal edge function', async () => {
      setupMocks(mockTeamMember, mockSubscription);
      vi.mocked((supabase as any).functions.invoke).mockResolvedValue({
        data: { url: 'https://billing.stripe.com/session/xyz' },
        error: null,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.openCustomerPortal();

      expect((supabase as any).functions.invoke).toHaveBeenCalledWith('customer-portal');
    });

    it('should open URL in new tab on success', async () => {
      setupMocks(mockTeamMember, mockSubscription);
      const portalUrl = 'https://billing.stripe.com/session/xyz';
      vi.mocked((supabase as any).functions.invoke).mockResolvedValue({
        data: { url: portalUrl },
        error: null,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.openCustomerPortal();

      expect(mockOpen).toHaveBeenCalledWith(portalUrl, '_blank');
    });

    it('should not open window on error', async () => {
      setupMocks(mockTeamMember, mockSubscription);
      vi.mocked((supabase as any).functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Portal error'),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.openCustomerPortal();

      expect(mockOpen).not.toHaveBeenCalled();
    });
  });
});
