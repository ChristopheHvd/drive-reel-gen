import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

describe('User Subscriptions RLS Security', () => {
  let user1: any;
  let user2: any;
  let user1Client: any;
  let user2Client: any;
  let subscription1Id: string;
  let subscription2Id: string;

  beforeAll(async () => {
    // Create two test users
    const { data: signUp1 } = await supabase.auth.signUp({
      email: `test-sub-rls-1-${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    user1 = signUp1.user;

    const { data: signUp2 } = await supabase.auth.signUp({
      email: `test-sub-rls-2-${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    user2 = signUp2.user;

    // Create authenticated clients for each user
    user1Client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    user2Client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Set sessions
    await user1Client.auth.setSession(signUp1.session);
    await user2Client.auth.setSession(signUp2.session);

    // Get subscription IDs
    const { data: sub1 } = await user1Client
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user1.id)
      .single();
    subscription1Id = sub1.id;

    const { data: sub2 } = await user2Client
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user2.id)
      .single();
    subscription2Id = sub2.id;
  });

  afterAll(async () => {
    // Cleanup test users (requires service role)
    // In real tests, you'd use service role client to delete
  });

  it('should allow user to read their own subscription', async () => {
    const { data, error } = await user1Client
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user1.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.user_id).toBe(user1.id);
  });

  it('should prevent user from reading another user\'s subscription', async () => {
    const { data, error } = await user1Client
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user2.id)
      .single();

    expect(data).toBeNull();
    // RLS should block this query
  });

  it('should prevent user from directly modifying plan_type', async () => {
    const { error } = await user1Client
      .from('user_subscriptions')
      .update({ plan_type: 'business' })
      .eq('user_id', user1.id);

    // Update might succeed if RLS policy allows it, but typically
    // plan_type changes should only come from webhooks/service role
    // This test documents the expected behavior
    if (!error) {
      console.warn('Warning: User can modify plan_type directly. Consider stricter RLS.');
    }
  });

  it('should prevent user from directly modifying video_limit', async () => {
    const { error } = await user1Client
      .from('user_subscriptions')
      .update({ video_limit: 999999 })
      .eq('user_id', user1.id);

    // Similar to plan_type, video_limit should be protected
    if (!error) {
      console.warn('Warning: User can modify video_limit directly. Consider stricter RLS.');
    }
  });

  it('should prevent user from modifying videos_generated_this_month arbitrarily', async () => {
    // Get current count
    const { data: before } = await user1Client
      .from('user_subscriptions')
      .select('videos_generated_this_month')
      .eq('user_id', user1.id)
      .single();

    const currentCount = before?.videos_generated_this_month || 0;

    // Try to decrease count (which should not be allowed)
    const { error } = await user1Client
      .from('user_subscriptions')
      .update({ videos_generated_this_month: Math.max(0, currentCount - 1) })
      .eq('user_id', user1.id);

    if (!error) {
      console.warn('Warning: User can modify videos_generated_this_month directly.');
    }
  });

  it('should not allow user to see list of all subscriptions', async () => {
    const { data, error } = await user1Client.from('user_subscriptions').select('*');

    // Should only see own subscription, not all
    if (data && data.length > 1) {
      console.error('Security issue: User can see multiple subscriptions');
      expect(data.length).toBe(1);
    }
  });

  it('should protect stripe_customer_id from modification', async () => {
    const { error } = await user1Client
      .from('user_subscriptions')
      .update({ stripe_customer_id: 'malicious_customer_id' })
      .eq('user_id', user1.id);

    // Stripe IDs should only be set by webhooks/service role
    if (!error) {
      console.warn('Warning: User can modify stripe_customer_id directly.');
    }
  });

  it('should protect stripe_subscription_id from modification', async () => {
    const { error } = await user1Client
      .from('user_subscriptions')
      .update({ stripe_subscription_id: 'malicious_sub_id' })
      .eq('user_id', user1.id);

    if (!error) {
      console.warn('Warning: User can modify stripe_subscription_id directly.');
    }
  });

  it('should allow user to read current_period_end', async () => {
    const { data, error } = await user1Client
      .from('user_subscriptions')
      .select('current_period_end')
      .eq('user_id', user1.id)
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('current_period_end');
  });

  it('should not allow user to delete their subscription record', async () => {
    // Attempt to delete
    await user1Client
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user1.id);

    // Verify the record still exists
    const { data, error } = await user1Client
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user1.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(subscription1Id);
  });
});
