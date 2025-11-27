import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { VideoLoadingPlaceholder } from './VideoLoadingPlaceholder';
import type { Video } from '@/features/videos/types';

// Mock Supabase storage
const mockCreateSignedUrl = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  },
}));

describe('VideoLoadingPlaceholder', () => {
  const mockImage = {
    id: 'test-image-id',
    storage_path: 'team-123/test-image.jpg',
    file_name: 'test-image.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024,
    team_id: 'team-123',
    uploaded_by: 'user-123',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    width: 1920,
    height: 1080,
  };

  const createMockVideo = (overrides?: Partial<Video>): Video => ({
    id: 'test-video-id',
    image_id: 'test-image-id',
    team_id: 'team-123',
    kie_task_id: 'task-123',
    video_url: '',
    status: 'pending',
    mode: 'packshot',
    prompt: 'Test prompt',
    aspect_ratio: '9:16',
    duration_seconds: 8,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    timeout_at: '2024-01-01',
    generation_type: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
    target_duration_seconds: 8,
    current_segment: 1,
    segment_prompts: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });
  });

  it('should render with pending status', () => {
    const mockVideo = createMockVideo({ status: 'pending' });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Préparation...')).toBeInTheDocument();
    expect(getByText(/initialisation de la génération/i)).toBeInTheDocument();
  });

  it('should render with processing status for 8s video', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 8,
      current_segment: 1,
    });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Génération en cours')).toBeInTheDocument();
    expect(getByText(/création de votre vidéo/i)).toBeInTheDocument();
  });

  it('should render segment progress for 16s video (segment 1)', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 16,
      current_segment: 1,
    });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Morceau 1/2')).toBeInTheDocument();
    expect(getByText(/génération du premier segment/i)).toBeInTheDocument();
  });

  it('should render segment progress for 16s video (segment 2)', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 16,
      current_segment: 2,
    });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Morceau 2/2')).toBeInTheDocument();
    expect(getByText(/génération du deuxième segment/i)).toBeInTheDocument();
  });

  it('should render merging status for 16s video', () => {
    const mockVideo = createMockVideo({ 
      status: 'merging',
      target_duration_seconds: 16,
      current_segment: 2,
    });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Assemblage en cours')).toBeInTheDocument();
    expect(getByText(/fusion des 2 morceaux de vidéo/i)).toBeInTheDocument();
  });

  it('should render merging status for 24s video', () => {
    const mockVideo = createMockVideo({ 
      status: 'merging',
      target_duration_seconds: 24,
      current_segment: 3,
    });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Assemblage en cours')).toBeInTheDocument();
    expect(getByText(/fusion des 3 morceaux de vidéo/i)).toBeInTheDocument();
  });

  it('should render segment progress for 24s video (segment 3)', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 24,
      current_segment: 3,
    });
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    expect(getByText('Morceau 3/3')).toBeInTheDocument();
    expect(getByText(/génération du troisième segment/i)).toBeInTheDocument();
  });

  it('should call Supabase to load background image', () => {
    const mockVideo = createMockVideo();
    render(<VideoLoadingPlaceholder image={mockImage} video={mockVideo} />);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      mockImage.storage_path,
      31536000
    );
  });

  it('should display animation elements', () => {
    const mockVideo = createMockVideo();
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    // Check for animated elements
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);

    const bounceElements = container.querySelectorAll('.animate-bounce');
    expect(bounceElements.length).toBeGreaterThan(0);
  });

  it('should handle image loading error gracefully', () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: new Error('Failed to load'),
    });

    const mockVideo = createMockVideo();
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    // Should still render without throwing
    expect(getByText('Préparation...')).toBeInTheDocument();
  });

  it('should have progress bar animation', () => {
    const mockVideo = createMockVideo({ status: 'processing' });
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    const progressBar = container.querySelector('.bg-gradient-to-r.from-primary.via-accent.to-primary');
    expect(progressBar).toBeInTheDocument();
  });

  it('should have glow effects', () => {
    const mockVideo = createMockVideo();
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    const glowElements = container.querySelectorAll('.blur-3xl');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('should have aspect-video container', () => {
    const mockVideo = createMockVideo();
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    const aspectContainer = container.querySelector('.aspect-video');
    expect(aspectContainer).toBeInTheDocument();
  });

  it('should have video and sparkles icons', () => {
    const mockVideo = createMockVideo({ status: 'processing' });
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    // Icons are rendered as SVGs
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should display step indicators for multi-segment videos', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 16,
      current_segment: 1,
    });
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    // 2 segments + 1 merge step = 3 indicators
    const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
    expect(indicators.length).toBe(3);
  });

  it('should not display step indicators for single-segment videos', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 8,
      current_segment: 1,
    });
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    // No indicators for single segment
    const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
    expect(indicators.length).toBe(0);
  });

  it('should highlight current step in indicators', () => {
    const mockVideo = createMockVideo({ 
      status: 'processing',
      target_duration_seconds: 16,
      current_segment: 2,
    });
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    const currentIndicator = container.querySelector('.animate-pulse.bg-primary.w-2.h-2');
    expect(currentIndicator).toBeInTheDocument();
  });

  it('should highlight merge step when merging', () => {
    const mockVideo = createMockVideo({ 
      status: 'merging',
      target_duration_seconds: 16,
      current_segment: 2,
    });
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} video={mockVideo} />
    );

    // All segment indicators should be completed (no animation)
    // Merge indicator (last one) should be animating
    const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
    const animatingIndicators = container.querySelectorAll('.animate-pulse.bg-primary.w-2.h-2');
    
    expect(indicators.length).toBe(3); // 2 segments + 1 merge
    expect(animatingIndicators.length).toBe(1); // Only merge step is animating
  });
});
