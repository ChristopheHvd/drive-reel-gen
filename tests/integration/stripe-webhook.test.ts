import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Stripe Webhook Integration', () => {
  let testUserId: string;
  let testTeamId: string;

  beforeEach(async () => {
    // Sign in test user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123',
    });

    if (signInError) throw signInError;
    testUserId = signInData.user!.id;

    // Get user's team
    const { data: teamData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', testUserId)
      .single();

    testTeamId = teamData!.team_id;

    // Reset subscription to Free plan
    await supabase
      .from('user_subscriptions')
      .update({
        plan_type: 'free',
        video_limit: 6,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        stripe_price_id: null,
      })
      .eq('user_id', testUserId);
  });

  describe('checkout.session.completed simulation', () => {
    it('should update subscription when upgraded to Pro', async () => {
      // Simulate webhook by directly updating database (as webhook would do)
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'pro',
          video_limit: 50,
          stripe_customer_id: 'cus_test_123',
          stripe_subscription_id: 'sub_test_123',
          stripe_price_id: 'price_1SSfSJBlI68zgCmzWM3uPZIu',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Verify update
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(subscription?.plan_type).toBe('pro');
      expect(subscription?.video_limit).toBe(50);
      expect(subscription?.stripe_customer_id).toBe('cus_test_123');
      expect(subscription?.stripe_subscription_id).toBe('sub_test_123');
    });

    it('should update subscription when upgraded to Business', async () => {
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'business',
          video_limit: 999999,
          stripe_customer_id: 'cus_test_456',
          stripe_subscription_id: 'sub_test_456',
          stripe_price_id: 'price_1SSfSxBlI68zgCmzD8NPr8Aq',
        })
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(subscription?.plan_type).toBe('business');
      expect(subscription?.video_limit).toBe(999999);
    });
  });

  describe('customer.subscription.updated simulation', () => {
    it('should update period dates when subscription renewed', async () => {
      // First set Pro plan
      await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'pro',
          video_limit: 50,
          stripe_subscription_id: 'sub_test_789',
        })
        .eq('user_id', testUserId);

      // Simulate subscription renewal
      const newPeriodStart = new Date();
      const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
        })
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(subscription?.current_period_start).toBe(newPeriodStart.toISOString());
      expect(subscription?.current_period_end).toBe(newPeriodEnd.toISOString());
    });

    it('should set cancel_at_period_end flag', async () => {
      await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'pro',
          stripe_subscription_id: 'sub_test_cancel',
        })
        .eq('user_id', testUserId);

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(subscription?.cancel_at_period_end).toBe(true);
    });
  });

  describe('customer.subscription.deleted simulation', () => {
    it('should reset subscription to Free plan when deleted', async () => {
      // First set Pro plan
      await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'pro',
          video_limit: 50,
          stripe_customer_id: 'cus_delete_test',
          stripe_subscription_id: 'sub_delete_test',
          stripe_price_id: 'price_test',
        })
        .eq('user_id', testUserId);

      // Simulate subscription deletion
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'free',
          video_limit: 6,
          stripe_subscription_id: null,
          stripe_price_id: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        })
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(subscription?.plan_type).toBe('free');
      expect(subscription?.video_limit).toBe(6);
      expect(subscription?.stripe_subscription_id).toBeNull();
      expect(subscription?.stripe_customer_id).toBe('cus_delete_test'); // Customer ID should remain
    });
  });

  describe('quota counter verification', () => {
    it('should preserve videos_generated_this_month during plan changes', async () => {
      // Set initial count
      await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'free',
          videos_generated_this_month: 3,
        })
        .eq('user_id', testUserId);

      // Upgrade to Pro
      await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'pro',
          video_limit: 50,
        })
        .eq('user_id', testUserId);

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(subscription?.videos_generated_this_month).toBe(3);
      expect(subscription?.video_limit).toBe(50);
    });
  });
});
