import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// Créer les mocks configurables avec vi.hoisted (hoisted = remontées au début)
const { mockUseImages, mockUseVideos, mockVideoConfigFormProps, mockUseSubscription } = vi.hoisted(() => ({
  mockUseImages: vi.fn(),
  mockUseVideos: vi.fn(),
  mockVideoConfigFormProps: vi.fn(),
  mockUseSubscription: vi.fn(),
}));

// Les mocks utilisent ces fonctions
vi.mock('@/features/images', () => ({
  ImageUploader: () => <div data-testid="image-uploader">ImageUploader</div>,
  ImageGrid: () => <div data-testid="image-grid">ImageGrid</div>,
  useImages: () => mockUseImages(),
}));

vi.mock('@/features/videos', () => ({
  VideoList: () => <div data-testid="video-list">VideoList</div>,
  VideoConfigForm: (props: any) => {
    mockVideoConfigFormProps(props); // Capture les props pour les assertions
    return <div data-testid="video-config">VideoConfigForm</div>;
  },
  useVideos: () => mockUseVideos(),
}));

vi.mock('@/features/subscription', () => ({
  useSubscription: () => mockUseSubscription(),
  QuotaExceededDialog: () => null,
}));

vi.mock('@/features/team', () => ({
  useCurrentTeam: () => ({ teamId: 'test-team-id' }),
  InviteModal: () => null,
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock('@/features/brand/components/BrandSettingsDialog', () => ({
  BrandSettingsDialog: ({ trigger }: any) => trigger,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Configuration par défaut (au moins 1 image pour que le layout 3 colonnes soit rendu)
    mockUseImages.mockReturnValue({
      images: [{
        id: 'img-1',
        file_name: 'test1.jpg',
        team_id: 'team-1',
        uploaded_by: 'user-1',
        storage_path: 'path1',
        file_size: 1000,
        mime_type: 'image/jpeg',
        width: 800,
        height: 600,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }],
      loading: false,
      deleteImage: vi.fn(),
      fetchImages: vi.fn(),
    });

    mockUseVideos.mockReturnValue({
      videos: [],
      loading: false,
      refetchVideos: vi.fn(),
    });

    mockUseSubscription.mockReturnValue({
      subscription: {
        plan_type: 'free',
        video_limit: 6,
        videos_generated_this_month: 0
      },
      videosRemaining: 6,
      isQuotaExceeded: false,
      nextResetDate: '1 janvier 2025',
      loading: false,
    });

    mockVideoConfigFormProps.mockClear();
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('should render header with logo and title', () => {
    const { getByText, getByAltText } = renderDashboard();

    expect(getByText('QuickQuick')).toBeInTheDocument();
    expect(getByAltText('QuickQuick')).toBeInTheDocument();
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

  it('should pass loading=false to VideoConfigForm by default', () => {
    mockUseImages.mockReturnValue({
      images: [{
        id: 'img-1',
        file_name: 'test1.jpg',
        team_id: 'team-1',
        uploaded_by: 'user-1',
        storage_path: 'path1',
        file_size: 1000,
        mime_type: 'image/jpeg',
        width: 800,
        height: 600,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }],
      loading: false,
      deleteImage: vi.fn(),
      fetchImages: vi.fn(),
    });

    renderDashboard();

    // Vérifier que loading=false est passé par défaut
    expect(mockVideoConfigFormProps).toHaveBeenCalledWith(
      expect.objectContaining({ loading: false })
    );
  });

  it('should show subscription info in header', () => {
    const { getByText, getByRole } = renderDashboard();

    // Le texte est réparti entre plusieurs <span>, donc chercher chaque partie
    expect(getByText('free', { exact: false })).toBeInTheDocument();
    expect(getByText('0/6 vidéos')).toBeInTheDocument();
    expect(getByRole('button', { name: /passer à pro/i })).toBeInTheDocument();
  });

  it('should have upload button in images panel', () => {
    const { getByRole } = renderDashboard();

    // Le bouton Upload est dans le panneau des images
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

    // Check left panel (images) - use attribute selector for Tailwind classes
    const leftPanel = container.querySelector('[class*="lg:col-span-3"]');
    expect(leftPanel).toBeInTheDocument();

    // Check center panel (videos)
    const centerPanel = container.querySelector('[class*="lg:col-span-6"]');
    expect(centerPanel).toBeInTheDocument();

    // Check right panel (config) - should be last col-span-3
    const allColSpan3 = container.querySelectorAll('[class*="lg:col-span-3"]');
    expect(allColSpan3.length).toBeGreaterThanOrEqual(2);
  });

  it('should have sticky header', () => {
    const { container } = renderDashboard();
    const header = container.querySelector('header.sticky');
    expect(header).toBeInTheDocument();
  });
});

describe('Dashboard - Auto-select first image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoConfigFormProps.mockClear();
  });

  it('should automatically select first image on load when images are available', () => {
    const mockImages = [
      {
        id: 'img-1',
        file_name: 'test1.jpg',
        team_id: 'team-1',
        uploaded_by: 'user-1',
        storage_path: 'path1',
        file_size: 1000,
        mime_type: 'image/jpeg',
        width: 800,
        height: 600,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
    ];

    // Reconfigurer le mock pour ce test spécifique
    mockUseImages.mockReturnValue({
      images: mockImages,
      loading: false,
      deleteImage: vi.fn(),
      fetchImages: vi.fn(),
    });

    mockUseVideos.mockReturnValue({
      videos: [],
      loading: false,
      refetchVideos: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Vérifier que VideoConfigForm a reçu selectedImageId = 'img-1'
    expect(mockVideoConfigFormProps).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedImageId: 'img-1',
      })
    );
  });

  it('should NOT auto-select when images array is empty', () => {
    // Utiliser la configuration par défaut (images vides)
    mockUseImages.mockReturnValue({
      images: [],
      loading: false,
      deleteImage: vi.fn(),
      fetchImages: vi.fn(),
    });

    mockUseVideos.mockReturnValue({
      videos: [],
      loading: false,
      refetchVideos: vi.fn(),
    });

    const { getByText, queryByTestId } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Quand il n'y a pas d'images, EmptyStateOnboarding est affiché
    // VideoConfigForm ne devrait pas être rendu
    expect(queryByTestId('video-config')).not.toBeInTheDocument();

    // Le message d'onboarding devrait apparaître
    expect(getByText(/uploadez vos premières images/i)).toBeInTheDocument();
  });

  it('should NOT auto-select while images are loading', () => {
    // Configurer avec loading=true
    mockUseImages.mockReturnValue({
      images: [],
      loading: true, // Still loading
      deleteImage: vi.fn(),
      fetchImages: vi.fn(),
    });

    mockUseVideos.mockReturnValue({
      videos: [],
      loading: false,
      refetchVideos: vi.fn(),
    });

    const { queryByTestId } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Pendant le chargement, rien n'est affiché (loading=true et images.length === 0)
    // VideoConfigForm ne devrait pas être rendu pendant le chargement
    expect(queryByTestId('video-config')).not.toBeInTheDocument();
  });
});
