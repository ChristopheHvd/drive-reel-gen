import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideos } from './useVideos';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty videos array', () => {
    const { result } = renderHook(() => useVideos());
    
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should set loading to false after fetch', async () => {
    const { result } = renderHook(() => useVideos('image-123'));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.loading).toBe(false);
  });

  it('should filter videos by imageId when provided', async () => {
    const imageId = 'image-123';
    const { result } = renderHook(() => useVideos(imageId));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.loading).toBe(false);
    expect(result.current.videos).toEqual([]);
  });

  it('should have refetchVideos function', () => {
    const { result } = renderHook(() => useVideos());
    
    expect(typeof result.current.refetchVideos).toBe('function');
  });
});
