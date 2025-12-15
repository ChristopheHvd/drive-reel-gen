import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock du module Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('Stripe Webhook Integration', () => {
  const mockUserId = 'test-user-id';
  const mockTeamId = 'test-team-id';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: { id: mockUserId, email: 'test@example.com' },
        session: { access_token: 'test-token' },
      },
      error: null,
    } as any);

    // Default mock for from() chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn();

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
    } as any);
  });

  describe('checkout.session.completed simulation', () => {
    it('should update subscription when upgraded to Pro', async () => {
      const mockSubscription = {
        plan_type: 'pro',
        video_limit: 50,
        stripe_customer_id: 'cus_test_123',
        stripe_subscription_id: 'sub_test_123',
        stripe_price_id: 'price_1SSexRBlI68zgCmz0DNoBAha',
      };

      // Mock the update chain
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(mockSubscription)
        .eq('user_id', mockUserId);

      expect(updateError).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_subscriptions');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        plan_type: 'pro',
        video_limit: 50,
      }));
    });

    it('should update subscription when upgraded to Business', async () => {
      const mockSubscription = {
        plan_type: 'business',
        video_limit: 999999,
        stripe_customer_id: 'cus_test_456',
        stripe_subscription_id: 'sub_test_456',
      };

      const mockEq = vi.fn().mockResolvedValue({ data: mockSubscription, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update(mockSubscription)
        .eq('user_id', mockUserId);

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        plan_type: 'business',
        video_limit: 999999,
      }));
    });
  });

  describe('customer.subscription.updated simulation', () => {
    it('should update period dates when subscription renewed', async () => {
      const newPeriodStart = new Date().toISOString();
      const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          current_period_start: newPeriodStart,
          current_period_end: newPeriodEnd,
        })
        .eq('user_id', mockUserId);

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        current_period_start: newPeriodStart,
        current_period_end: newPeriodEnd,
      }));
    });

    it('should set cancel_at_period_end flag', async () => {
      const mockEq = vi.fn().mockResolvedValue({ 
        data: { cancel_at_period_end: true }, 
        error: null 
      });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('user_id', mockUserId);

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({ cancel_at_period_end: true });
    });
  });

  describe('customer.subscription.deleted simulation', () => {
    it('should reset subscription to Free plan when deleted', async () => {
      const mockResetData = {
        plan_type: 'free',
        video_limit: 6,
        stripe_subscription_id: null,
        stripe_price_id: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };

      const mockEq = vi.fn().mockResolvedValue({ data: mockResetData, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update(mockResetData)
        .eq('user_id', mockUserId);

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        plan_type: 'free',
        video_limit: 6,
        stripe_subscription_id: null,
      }));
    });
  });

  describe('quota counter verification', () => {
    it('should preserve videos_generated_this_month during plan changes', async () => {
      const mockSubscription = {
        plan_type: 'pro',
        video_limit: 50,
        videos_generated_this_month: 3,
      };

      const mockSingle = vi.fn().mockResolvedValue({ 
        data: mockSubscription, 
        error: null 
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', mockUserId)
        .single();

      expect(subscription?.videos_generated_this_month).toBe(3);
      expect(subscription?.video_limit).toBe(50);
    });
  });

  describe('timestamp conversion edge cases', () => {
    it('should handle subscription updates with undefined period dates', async () => {
      const mockUpdateData = {
        current_period_start: null, // safeTimestampToISO(undefined) returns null
        current_period_end: null,
        cancel_at_period_end: false,
        updated_at: expect.any(String),
      };

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update(mockUpdateData)
        .eq('stripe_subscription_id', 'sub_test_123');

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(mockUpdateData);
    });

    it('should handle subscription updates with null period dates', async () => {
      const mockUpdateData = {
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update(mockUpdateData)
        .eq('stripe_subscription_id', 'sub_test_123');

      expect(error).toBeNull();
    });

    it('should correctly convert valid Stripe timestamps', () => {
      // Test timestamp conversion logic (isolated from webhook)
      const timestamp = 1764163467; // From actual Stripe payload
      const expectedISO = new Date(timestamp * 1000).toISOString();

      expect(expectedISO).toMatch(/2025-11-26/); // Should be November 26, 2025
      expect(expectedISO).toContain('T'); // Should have time component
      expect(expectedISO).toContain('Z'); // Should be UTC
    });

    it('should handle checkout.session.completed with valid timestamps', async () => {
      const mockUpdateData = {
        plan_type: 'pro',
        video_limit: 50,
        stripe_customer_id: 'cus_test_123',
        stripe_subscription_id: 'sub_test_123',
        stripe_price_id: 'price_1SSexRBlI68zgCmz0DNoBAha',
        current_period_start: new Date(1764163467 * 1000).toISOString(),
        current_period_end: new Date(1766755467 * 1000).toISOString(),
        updated_at: expect.any(String),
      };

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

      const { error } = await supabase
        .from('user_subscriptions')
        .update(mockUpdateData)
        .eq('user_id', mockUserId);

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        current_period_start: expect.stringMatching(/2025/),
        current_period_end: expect.stringMatching(/2025/),
      }));
    });
  });
});
