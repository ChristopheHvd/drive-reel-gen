import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('@/features/images', () => ({
  ImageUploader: () => <div data-testid="image-uploader">ImageUploader</div>,
  ImageGrid: () => <div data-testid="image-grid">ImageGrid</div>,
  useImages: () => ({
    images: [],
    loading: false,
    deleteImage: vi.fn(),
    fetchImages: vi.fn(),
  }),
}));

vi.mock('@/features/videos', () => ({
  VideoList: () => <div data-testid="video-list">VideoList</div>,
  VideoConfigForm: () => <div data-testid="video-config">VideoConfigForm</div>,
  useVideos: () => ({
    videos: [],
    loading: false,
    refetchVideos: vi.fn(),
  }),
}));

describe('Dashboard', () => {
  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('should render header with logo and title', () => {
    const { getByText, getByAltText } = renderDashboard();
    
    expect(getByText('Daft Funk')).toBeInTheDocument();
    expect(getByAltText('Daft Funk')).toBeInTheDocument();
  });

  it('should render three main panels', () => {
    const { getByText } = renderDashboard();
    
    expect(getByText('Mes Images')).toBeInTheDocument();
    expect(getByText('Vidéos générées')).toBeInTheDocument();
    expect(getByText('Génération Vidéo IA')).toBeInTheDocument();
  });

  it('should render ImageGrid in left panel', () => {
    const { getByTestId } = renderDashboard();
    
    expect(getByTestId('image-grid')).toBeInTheDocument();
  });

  it('should render VideoList in center panel', () => {
    const { getByTestId } = renderDashboard();
    
    expect(getByTestId('video-list')).toBeInTheDocument();
  });

  it('should render VideoConfigForm in right panel', () => {
    const { getByTestId } = renderDashboard();
    
    expect(getByTestId('video-config')).toBeInTheDocument();
  });

  it('should show subscription info in header', () => {
    const { getByText, getByRole } = renderDashboard();
    
    expect(getByText(/free • 0\/6 vidéos/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /passer à pro/i })).toBeInTheDocument();
  });

  it('should have upload button in images panel', () => {
    const { getByRole } = renderDashboard();
    
    const uploadButton = getByRole('button', { name: /upload/i });
    expect(uploadButton).toBeInTheDocument();
  });

  it('should use full-screen layout', () => {
    const { container } = renderDashboard();
    const mainContainer = container.querySelector('.h-screen');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should have 3-column layout (3-6-3 on large screens)', () => {
    const { container } = renderDashboard();
    
    // Check left panel (images)
    const leftPanel = container.querySelector('.lg\\:col-span-3');
    expect(leftPanel).toBeInTheDocument();
    
    // Check center panel (videos)
    const centerPanel = container.querySelector('.lg\\:col-span-6');
    expect(centerPanel).toBeInTheDocument();
    
    // Check right panel (config) - should be last col-span-3
    const allColSpan3 = container.querySelectorAll('.lg\\:col-span-3');
    expect(allColSpan3.length).toBeGreaterThanOrEqual(2);
  });

  it('should have sticky header', () => {
    const { container } = renderDashboard();
    const header = container.querySelector('header.sticky');
    expect(header).toBeInTheDocument();
  });
});
