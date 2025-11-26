import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Stripe Checkout Integration', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Sign in test user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123',
    });

    if (signInError) throw signInError;
    testUser = signInData.user;
    authToken = signInData.session?.access_token || '';
  });

  describe('create-checkout Edge Function', () => {
    it('should create a Stripe checkout session for authenticated user', async () => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSfSJBlI68zgCmzWM3uPZIu' },
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('url');
      expect(data.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    });

    it('should return error for invalid price ID', async () => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'invalid_price_id' },
      });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should return error when not authenticated', async () => {
      await supabase.auth.signOut();

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSfSJBlI68zgCmzWM3uPZIu' },
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not authenticated|unauthorized/i);
    });

    it('should handle existing Stripe customer', async () => {
      // First checkout to create customer
      await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSfSJBlI68zgCmzWM3uPZIu' },
      });

      // Second checkout should reuse customer
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSfSxBlI68zgCmzD8NPr8Aq' },
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('url');
    });
  });

  describe('customer-portal Edge Function', () => {
    it('should create a customer portal session', async () => {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (!error) {
        expect(data).toHaveProperty('url');
        expect(data.url).toMatch(/^https:\/\/billing\.stripe\.com\//);
      } else {
        // If no customer exists yet, expect specific error
        expect(error.message).toMatch(/No Stripe customer found/);
      }
    });

    it('should return error when not authenticated', async () => {
      await supabase.auth.signOut();

      const { data, error } = await supabase.functions.invoke('customer-portal');

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not authenticated|unauthorized/i);
    });
  });
});
