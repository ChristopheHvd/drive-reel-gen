import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoList } from './VideoList';
import { Video } from '../types';

const mockVideos: Video[] = [
  {
    id: '1',
    image_id: 'img-1',
    video_url: 'https://example.com/video1.mp4',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    status: 'completed',
    mode: 'packshot',
    prompt: 'Test prompt',
    aspect_ratio: '9:16',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('VideoList', () => {
  it('should render loading skeletons', () => {
    const { container } = render(
      <VideoList
        videos={[]}
        loading={true}
        onGenerateVideo={vi.fn()}
      />
    );
    
    // Les skeletons devraient être présents
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show message when no image selected', () => {
    const { getByText } = render(
      <VideoList
        videos={[]}
        loading={false}
        onGenerateVideo={vi.fn()}
      />
    );
    
    expect(getByText(/aucune image sélectionnée/i)).toBeInTheDocument();
  });

  it('should show generate button when no videos for selected image', () => {
    const onGenerateVideo = vi.fn();
    
    const { getByText, getByRole } = render(
      <VideoList
        imageId="img-1"
        videos={[]}
        loading={false}
        onGenerateVideo={onGenerateVideo}
      />
    );
    
    expect(getByText(/aucune vidéo générée/i)).toBeInTheDocument();
    
    const generateButton = getByRole('button', { name: /générer une vidéo/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('should call onGenerateVideo when button clicked', async () => {
    const user = userEvent.setup();
    const onGenerateVideo = vi.fn();
    
    const { getByRole } = render(
      <VideoList
        imageId="img-1"
        videos={[]}
        loading={false}
        onGenerateVideo={onGenerateVideo}
      />
    );
    
    const generateButton = getByRole('button', { name: /générer une vidéo/i });
    await user.click(generateButton);
    
    expect(onGenerateVideo).toHaveBeenCalledTimes(1);
  });

  it('should render video cards when videos exist', () => {
    const { getByText } = render(
      <VideoList
        imageId="img-1"
        videos={mockVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
      />
    );
    
    expect(getByText('Test prompt')).toBeInTheDocument();
    expect(getByText('packshot')).toBeInTheDocument();
    expect(getByText('9:16')).toBeInTheDocument();
  });

  it('should display thumbnail when available', () => {
    const { getByAltText } = render(
      <VideoList
        imageId="img-1"
        videos={mockVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
      />
    );
    
    const thumbnail = getByAltText('Thumbnail');
    expect(thumbnail).toHaveAttribute('src', mockVideos[0].thumbnail_url);
  });
});
