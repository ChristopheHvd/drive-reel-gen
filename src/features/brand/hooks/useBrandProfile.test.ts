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
    const mockTeamId = 'team-123';
    
    const mockFromTeamMembers = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { team_id: mockTeamId },
            error: null,
          }),
        }),
      }),
    });

    const mockFromBrandProfiles = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any)
      .mockImplementationOnce(mockFromTeamMembers)
      .mockImplementationOnce(mockFromBrandProfiles);

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeTruthy();
    expect(result.current.profile?.company_name).toBe('Test Company');
  });

  it('should handle no profile found', async () => {
    const mockTeamId = 'team-123';
    
    const mockFromTeamMembers = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { team_id: mockTeamId },
            error: null,
          }),
        }),
      }),
    });

    const mockFromBrandProfiles = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any)
      .mockImplementationOnce(mockFromTeamMembers)
      .mockImplementationOnce(mockFromBrandProfiles);

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should update profile successfully', async () => {
    const mockTeamId = 'team-123';
    let callCount = 0;

    (supabase.from as any).mockImplementation((table: string) => {
      callCount++;
      
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { team_id: mockTeamId },
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (table === 'brand_profiles') {
        if (callCount === 2) {
          // Initial load
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          // Check existing
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'profile-123' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 5) {
          // Update
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        } else {
          // Reload after update
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
          };
        }
      }
    });

    const { result } = renderHook(() => useBrandProfile());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfile({
        company_name: 'Updated Company',
      });
    });

    expect(result.current.error).toBeNull();
  });

  it('should handle update errors', async () => {
    const mockTeamId = 'team-123';
    let callCount = 0;

    (supabase.from as any).mockImplementation((table: string) => {
      callCount++;
      
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { team_id: mockTeamId },
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (table === 'brand_profiles') {
        if (callCount === 2) {
          // Initial load
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          // Check existing
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'profile-123' },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Update with error
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: 'Update failed' },
              }),
            }),
          };
        }
      }
    });

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
