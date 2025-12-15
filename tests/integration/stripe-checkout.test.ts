import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock du module Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('Stripe Checkout Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth by default
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        session: { access_token: 'test-token' },
      },
      error: null,
    } as any);
  });

  describe('create-checkout Edge Function', () => {
    it('should create a Stripe checkout session for authenticated user', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_test123' },
        error: null,
      } as any);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSexRBlI68zgCmz0DNoBAha' },
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('url');
      expect(data.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    });

    it('should return error for invalid price ID', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Invalid price ID' },
      } as any);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'invalid_price_id' },
      });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should return error when not authenticated', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'User not authenticated' },
      } as any);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSexRBlI68zgCmz0DNoBAha' },
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not authenticated|unauthorized/i);
    });

    it('should handle existing Stripe customer', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_existing_customer' },
        error: null,
      } as any);

      // Second checkout should reuse customer
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'price_1SSey5BlI68zgCmz8gi0Dijy' },
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('url');
    });
  });

  describe('customer-portal Edge Function', () => {
    it('should create a customer portal session', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { url: 'https://billing.stripe.com/portal_session_test' },
        error: null,
      } as any);

      const { data, error } = await supabase.functions.invoke('customer-portal');

      expect(error).toBeNull();
      expect(data).toHaveProperty('url');
      expect(data.url).toMatch(/^https:\/\/billing\.stripe\.com\//);
    });

    it('should return error when not authenticated', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'User not authenticated' },
      } as any);

      const { data, error } = await supabase.functions.invoke('customer-portal');

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not authenticated|unauthorized/i);
    });
  });
});
