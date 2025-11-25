import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { VideoLoadingPlaceholder } from './VideoLoadingPlaceholder';

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });
  });

  it('should render with pending status', () => {
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} status="pending" />
    );

    expect(getByText('Préparation...')).toBeInTheDocument();
    expect(getByText(/votre vidéo instagram reels/i)).toBeInTheDocument();
  });

  it('should render with processing status', () => {
    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} status="processing" />
    );

    expect(getByText('Génération en cours')).toBeInTheDocument();
    expect(getByText(/votre vidéo instagram reels/i)).toBeInTheDocument();
  });

  it('should call Supabase to load background image', () => {
    render(<VideoLoadingPlaceholder image={mockImage} status="pending" />);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      mockImage.storage_path,
      31536000
    );
  });

  it('should display animation elements', () => {
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} status="pending" />
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

    const { getByText } = render(
      <VideoLoadingPlaceholder image={mockImage} status="pending" />
    );

    // Should still render without throwing
    expect(getByText('Préparation...')).toBeInTheDocument();
  });

  it('should have progress bar animation', () => {
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} status="processing" />
    );

    const progressBar = container.querySelector('.bg-gradient-to-r.from-primary.via-accent.to-primary');
    expect(progressBar).toBeInTheDocument();
  });

  it('should have glow effects', () => {
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} status="pending" />
    );

    const glowElements = container.querySelectorAll('.blur-3xl');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('should render with minimum height', () => {
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} status="pending" />
    );

    const mainContainer = container.querySelector('.min-h-\\[500px\\]');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should have video and sparkles icons', () => {
    const { container } = render(
      <VideoLoadingPlaceholder image={mockImage} status="processing" />
    );

    // Icons are rendered as SVGs
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});
