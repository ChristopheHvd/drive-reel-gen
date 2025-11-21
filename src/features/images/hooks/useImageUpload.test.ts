import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageUpload } from './useImageUpload';
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

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useImageUpload());
    
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should upload images successfully', async () => {
    const mockUser = { id: 'user-123' };
    const mockTeamId = 'team-123';
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { team_id: mockTeamId },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'img-1',
                team_id: mockTeamId,
                uploaded_by: mockUser.id,
                storage_path: `${mockTeamId}/test.jpg`,
                file_name: 'test.jpg',
                file_size: 4,
                mime_type: 'image/jpeg',
              },
              error: null,
            }),
          }),
        }),
      });
    (supabase.from as any) = mockFrom;

    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: null,
      }),
    });
    (supabase.storage.from as any) = mockStorageFrom;

    const { result } = renderHook(() => useImageUpload());

    let uploadedImages: any[];
    await act(async () => {
      uploadedImages = await result.current.uploadImages([mockFile]);
    });

    expect(uploadedImages!).toHaveLength(1);
    expect(uploadedImages![0].file_name).toBe('test.jpg');
    expect(result.current.isUploading).toBe(false);
  });

  it('should reject files that are too large', async () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    });

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { team_id: 'team-123' },
            error: null,
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useImageUpload());

    await act(async () => {
      await result.current.uploadImages([largeFile]);
    });

    expect(result.current.progress[0].status).toBe('error');
    expect(result.current.progress[0].error).toContain('trop volumineux');
  });

  it('should reject unsupported file types', async () => {
    const unsupportedFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { team_id: 'team-123' },
            error: null,
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useImageUpload());

    await act(async () => {
      await result.current.uploadImages([unsupportedFile]);
    });

    expect(result.current.progress[0].status).toBe('error');
    expect(result.current.progress[0].error).toContain('Type de fichier non autorisé');
  });

  it('should handle unauthenticated user', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: null },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    const { result } = renderHook(() => useImageUpload());

    await expect(
      act(async () => {
        await result.current.uploadImages([mockFile]);
      })
    ).rejects.toThrow("Non authentifié");
  });

  it('should reset progress', () => {
    const { result } = renderHook(() => useImageUpload());

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.progress).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle multiple files upload', async () => {
    const mockUser = { id: 'user-123' };
    const mockTeamId = 'team-123';
    const files = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
    });
    (supabase.auth.getUser as any) = mockGetUser;

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      if (callCount === 0) {
        callCount++;
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
      } else {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: `img-${callCount}`,
                  team_id: mockTeamId,
                  uploaded_by: mockUser.id,
                  storage_path: `${mockTeamId}/test${callCount}.jpg`,
                  file_name: `test${callCount}.jpg`,
                  file_size: 5,
                  mime_type: 'image/jpeg',
                },
                error: null,
              }),
            }),
          }),
        };
      }
    });
    (supabase.from as any) = mockFrom;

    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });
    (supabase.storage.from as any) = mockStorageFrom;

    const { result } = renderHook(() => useImageUpload());

    let uploadedImages: any[];
    await act(async () => {
      uploadedImages = await result.current.uploadImages(files);
    });

    expect(uploadedImages!).toHaveLength(2);
  });
});
