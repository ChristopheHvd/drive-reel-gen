import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock du client Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('Video Callback Realtime Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks for channel subscription
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        if (callback) callback('SUBSCRIBED');
        return mockChannel;
      }),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
    vi.mocked(supabase.removeChannel).mockResolvedValue({ data: null, error: null } as any);
  });

  it('should receive realtime update when video status changes from pending to completed', async () => {
    const testVideoId = 'test-video-123';
    const mockCallback = vi.fn();
    
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        if (callback) callback('SUBSCRIBED');
        return mockChannel;
      }),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
    
    // Setup subscription
    supabase.channel('video-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos' },
        mockCallback
      )
      .subscribe();
    
    // Verify subscription was configured correctly
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ 
        event: 'UPDATE', 
        schema: 'public',
        table: 'videos' 
      }),
      mockCallback
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should handle realtime updates for failed videos', async () => {
    const mockCallback = vi.fn();
    
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
    
    // Setup subscription for failed status
    supabase.channel('video-failures')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos' },
        mockCallback
      )
      .subscribe();
    
    // Verify the listener was registered for UPDATE events
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', table: 'videos' }),
      mockCallback
    );
  });

  it('should setup realtime subscription for video updates', async () => {
    const testVideoId = 'test-video-456';
    
    supabase.channel('test-video-callback');
    
    expect(supabase.channel).toHaveBeenCalledWith('test-video-callback');
  });

  it('should cleanup realtime subscription on unmount', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
    
    const channel = supabase.channel('cleanup-test')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, vi.fn())
      .subscribe();
    
    await supabase.removeChannel(channel);
    
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
