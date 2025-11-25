import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPlayer } from './VideoPlayer';
import { Video } from '../types';

const mockCompletedVideo: Video = {
  id: '1',
  image_id: 'img-1',
  team_id: 'team-1',
  kie_task_id: 'task-123',
  video_url: 'team-id/video.mp4',
  thumbnail_url: 'thumb.jpg',
  status: 'completed',
  mode: 'packshot',
  prompt: 'Test prompt',
  aspect_ratio: '9:16',
  duration_seconds: 8,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  timeout_at: '2024-01-01T00:10:00Z',
  generation_type: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
};

describe('VideoPlayer', () => {
  it('should render video player for completed video', () => {
    const onDelete = vi.fn();
    
    const { getByText } = render(
      <VideoPlayer 
        video={mockCompletedVideo} 
        onDelete={onDelete} 
      />
    );
    
    expect(getByText('Test prompt')).toBeInTheDocument();
    expect(getByText('Terminée')).toBeInTheDocument();
  });

  it('should show "Recommencer" button for completed video', () => {
    const onDelete = vi.fn();
    const onRegenerate = vi.fn();
    
    const { getByText } = render(
      <VideoPlayer 
        video={mockCompletedVideo} 
        onDelete={onDelete}
        onRegenerate={onRegenerate}
      />
    );
    
    expect(getByText('Recommencer')).toBeInTheDocument();
  });

  it('should call onRegenerate when "Recommencer" clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onRegenerate = vi.fn();
    
    const { getByText } = render(
      <VideoPlayer 
        video={mockCompletedVideo} 
        onDelete={onDelete}
        onRegenerate={onRegenerate}
      />
    );
    
    const regenerateButton = getByText('Recommencer');
    await user.click(regenerateButton);
    
    expect(onRegenerate).toHaveBeenCalledWith(mockCompletedVideo);
  });

  it('should not show "Recommencer" button for pending video', () => {
    const onDelete = vi.fn();
    const onRegenerate = vi.fn();
    const pendingVideo = { ...mockCompletedVideo, status: 'pending' as const };
    
    const { queryByText } = render(
      <VideoPlayer 
        video={pendingVideo} 
        onDelete={onDelete}
        onRegenerate={onRegenerate}
      />
    );
    
    expect(queryByText('Recommencer')).not.toBeInTheDocument();
  });

  it('should not show "Recommencer" button when onRegenerate not provided', () => {
    const onDelete = vi.fn();
    
    const { queryByText } = render(
      <VideoPlayer 
        video={mockCompletedVideo} 
        onDelete={onDelete}
      />
    );
    
    expect(queryByText('Recommencer')).not.toBeInTheDocument();
  });
});
