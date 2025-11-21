import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImages } from './useImages';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('useImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useImages());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.images).toEqual([]);
  });

  it('should fetch images successfully', async () => {
    const mockUser = { id: 'user-123' };
    const mockImages = [
      {
        id: 'img-1',
        team_id: 'team-123',
        uploaded_by: 'user-123',
        storage_path: 'team-123/image1.jpg',
        file_name: 'image1.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockImages,
          error: null,
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useImages());

    // Attendre que loading soit false
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.images).toEqual(mockImages);
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Fetch failed');
    
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useImages());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.error).toBeTruthy();
  });

  it('should handle unauthenticated user', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: null },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const { result } = renderHook(() => useImages());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.error?.message).toContain("Non authentifié");
  });
});
