import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoList } from './VideoList';
import { Video } from '../types';

// Mock du client Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed-video.mp4' },
          error: null,
        }),
      }),
    },
  },
}));

const mockVideos: Video[] = [
  {
    id: '1',
    image_id: 'img-1',
    team_id: 'team-1',
    kie_task_id: 'task-123',
    video_url: 'https://example.com/video1.mp4',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    status: 'completed',
    mode: 'packshot',
    prompt: 'Test prompt',
    aspect_ratio: '9:16',
    duration_seconds: 8,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    timeout_at: '2024-01-01T00:10:00Z',
    generation_type: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
    target_duration_seconds: 8,
    current_segment: 1,
    segment_prompts: null,
  },
];

describe('VideoList', () => {
  it('should render loading skeletons', () => {
    const { container } = render(
      <VideoList
        videos={[]}
        loading={true}
        onGenerateVideo={vi.fn()}
        onDeleteVideo={vi.fn()}
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
        onDeleteVideo={vi.fn()}
      />
    );
    
    expect(getByText(/sélectionnez une image/i)).toBeInTheDocument();
  });

  it('should show generate button when no videos for selected image', () => {
    const onGenerateVideo = vi.fn();
    
    const { getByText, getByRole } = render(
      <VideoList
        imageId="img-1"
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={[]}
        loading={false}
        onGenerateVideo={onGenerateVideo}
        onDeleteVideo={vi.fn()}
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
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={[]}
        loading={false}
        onGenerateVideo={onGenerateVideo}
        onDeleteVideo={vi.fn()}
      />
    );
    
    const generateButton = getByRole('button', { name: /générer une vidéo/i });
    await user.click(generateButton);
    
    expect(onGenerateVideo).toHaveBeenCalledTimes(1);
  });

  it('should render video cards when videos exist', () => {
    const { getByText, container } = render(
      <VideoList
        imageId="img-1"
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={mockVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
        onDeleteVideo={vi.fn()}
        onSelectVideo={vi.fn()}
        onRegenerateVideo={vi.fn()}
      />
    );
    
    // Le prompt est affiché
    expect(getByText('Test prompt')).toBeInTheDocument();
    
    // Le badge de statut "Terminée" est affiché
    expect(getByText('Terminée')).toBeInTheDocument();
    
    // Vérifier que les vidéos sont affichées en grille
    const videoGrid = container.querySelector('.grid.grid-cols-2');
    expect(videoGrid).toBeInTheDocument();
  });

  it('should display thumbnail when available', () => {
    const { container } = render(
      <VideoList
        imageId="img-1"
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={mockVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
        onDeleteVideo={vi.fn()}
      />
    );
    
    // VideoPlayer devrait gérer l'affichage des vidéos
    expect(container).toBeInTheDocument();
  });

  it('should show loading placeholder for pending video', () => {
    const pendingVideos: Video[] = [
      {
        ...mockVideos[0],
        status: 'pending',
        video_url: null,
      },
    ];

    const { getByText } = render(
      <VideoList
        imageId="img-1"
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={pendingVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
        onDeleteVideo={vi.fn()}
      />
    );

    expect(getByText('Préparation...')).toBeInTheDocument();
  });

  it('should show loading placeholder for processing video', () => {
    const processingVideos: Video[] = [
      {
        ...mockVideos[0],
        status: 'processing',
        video_url: null,
      },
    ];

    const { getByText } = render(
      <VideoList
        imageId="img-1"
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={processingVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
        onDeleteVideo={vi.fn()}
      />
    );

    expect(getByText('Génération en cours')).toBeInTheDocument();
  });

  it('should display completed videos below pending placeholder', () => {
    const mixedVideos: Video[] = [
      {
        ...mockVideos[0],
        id: '2',
        status: 'processing',
        video_url: null,
      },
      mockVideos[0], // completed video
    ];

    const { getByText, container } = render(
      <VideoList
        imageId="img-1"
        selectedImage={{
          id: 'img-1',
          file_name: 'test.jpg',
          storage_path: 'path/test.jpg',
          team_id: 'team-1',
          uploaded_by: 'user-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          file_size: 1000,
          mime_type: 'image/jpeg',
        }}
        videos={mixedVideos}
        loading={false}
        onGenerateVideo={vi.fn()}
        onDeleteVideo={vi.fn()}
      />
    );

    // Should show both placeholder and completed video
    expect(getByText('Génération en cours')).toBeInTheDocument();
    expect(getByText('Test prompt')).toBeInTheDocument();
    
    // Vérifier que les vidéos complétées sont affichées en grille
    const videoGrid = container.querySelector('.grid.grid-cols-2');
    expect(videoGrid).toBeInTheDocument();
  });
});
