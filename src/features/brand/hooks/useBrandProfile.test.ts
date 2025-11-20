import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBrandProfile } from './useBrandProfile';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('useBrandProfile - Regression Tests', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = {
    id: 'profile-123',
    user_id: 'user-123',
    company_name: 'Test Company',
    website_url: 'https://test.com',
    business_description: 'Test description',
    target_audience: 'Test audience',
    brand_values: ['innovation', 'quality'],
    visual_identity: { colors: ['#000'], style: 'modern', imagery: 'clean' },
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  it('should load brand profile on mount', async () => {
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    };
    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeTruthy();
    expect(result.current.profile?.company_name).toBe('Test Company');
  });

  it('should handle no profile found', async () => {
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } // No rows returned
      }),
    };
    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should update profile successfully', async () => {
    const mockFromSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // Initial load on mount
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null }) // Check existing profile
        .mockResolvedValueOnce({ data: mockProfile, error: null }), // Load profile after update
    };

    const mockFromUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    (supabase.from as any)
      .mockReturnValueOnce(mockFromSelect) // Initial load on mount
      .mockReturnValueOnce(mockFromSelect) // Check existing profile
      .mockReturnValueOnce(mockFromUpdate) // Update call
      .mockReturnValueOnce(mockFromSelect); // Load profile after update

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfile({
        company_name: 'Updated Company',
      });
    });

    expect(mockFromUpdate.update).toHaveBeenCalled();
  });

  it('should handle update errors', async () => {
    const mockFromSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'profile-123' }, error: null }),
    };

    const mockFromUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    };

    (supabase.from as any)
      .mockReturnValueOnce(mockFromSelect)
      .mockReturnValueOnce(mockFromUpdate);

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.updateProfile({
          company_name: 'Updated Company',
        });
      })
    ).rejects.toThrow();
  });
});
