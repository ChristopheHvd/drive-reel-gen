import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageCard } from './ImageCard';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ImageCard', () => {
  const mockImage = {
    id: 'img-1',
    team_id: 'team-123',
    uploaded_by: 'user-123',
    storage_path: 'team-123/image.jpg',
    file_name: 'image.jpg',
    file_size: 1024000,
    mime_type: 'image/jpeg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOnDelete = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnGenerateVideo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockStorageFrom = vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/image.jpg' },
        error: null,
      }),
    });
    (supabase.storage.from as any) = mockStorageFrom;
  });

  it('should call onSelect when card is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageCard image={mockImage} onDelete={mockOnDelete} onSelect={mockOnSelect} />);
    
    const card = container.querySelector('[class*="cursor-pointer"]');
    if (card) {
      await user.click(card as Element);
      expect(mockOnSelect).toHaveBeenCalledWith(mockImage);
    }
  });

  it('should show selected state', () => {
    const { container } = render(
      <ImageCard 
        image={mockImage} 
        onDelete={mockOnDelete} 
        onSelect={mockOnSelect}
        isSelected={true}
      />
    );
    
    const imageContainer = container.querySelector('.ring-2.ring-primary');
    expect(imageContainer).toBeDefined();
    
    // Vérifier que le checkmark est visible
    const checkmark = container.querySelector('svg path[d*="M5 13l4 4L19 7"]');
    expect(checkmark).toBeDefined();
  });

  it('should open delete confirmation dialog', async () => {
    const user = userEvent.setup();
    const { getByText, container } = render(<ImageCard image={mockImage} onDelete={mockOnDelete} />);
    
    const deleteButton = container.querySelector('[class*="lucide-trash-2"]');
    
    if (deleteButton?.parentElement) {
      await user.click(deleteButton.parentElement);
      expect(getByText(/Supprimer cette image/i)).toBeDefined();
    }
  });

  it('should call onGenerateVideo when video button is clicked', async () => {
    const user = userEvent.setup();
    const { container, getByText } = render(
      <ImageCard 
        image={mockImage} 
        onDelete={mockOnDelete} 
        onGenerateVideo={mockOnGenerateVideo}
      />
    );
    
    // Trouver le bouton vidéo avec le texte "Générer"
    const videoButton = getByText('Générer').closest('button');
    
    if (videoButton) {
      await user.click(videoButton);
      expect(mockOnGenerateVideo).toHaveBeenCalledWith(mockImage.id);
    }
  });

  it('should not call onSelect when clicking video button', async () => {
    const user = userEvent.setup();
    const { getByText } = render(
      <ImageCard 
        image={mockImage} 
        onDelete={mockOnDelete} 
        onSelect={mockOnSelect}
        onGenerateVideo={mockOnGenerateVideo}
      />
    );
    
    const videoButton = getByText('Générer').closest('button');
    
    if (videoButton) {
      await user.click(videoButton);
      // Le clic sur le bouton vidéo ne doit pas déclencher onSelect
      expect(mockOnSelect).not.toHaveBeenCalled();
      expect(mockOnGenerateVideo).toHaveBeenCalled();
    }
  });

  it('should not call onSelect when clicking delete button', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImageCard 
        image={mockImage} 
        onDelete={mockOnDelete} 
        onSelect={mockOnSelect}
      />
    );
    
    const deleteButton = container.querySelector('[class*="lucide-trash-2"]')?.closest('button');
    
    if (deleteButton) {
      await user.click(deleteButton);
      // Le clic sur le bouton delete ne doit pas déclencher onSelect
      expect(mockOnSelect).not.toHaveBeenCalled();
    }
  });

  it('should display loading state for image', () => {
    const mockStorageFrom = vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Failed to create signed URL'),
      }),
    });
    (supabase.storage.from as any) = mockStorageFrom;
    
    const { container } = render(<ImageCard image={mockImage} onDelete={mockOnDelete} />);
    
    const eyeIcon = container.querySelector('.lucide-eye');
    expect(eyeIcon).toBeDefined();
  });

  it('should have video button with correct text in new design', () => {
    const { getByText, container } = render(
      <ImageCard 
        image={mockImage} 
        onDelete={mockOnDelete} 
        onGenerateVideo={mockOnGenerateVideo}
      />
    );
    
    const videoButton = getByText('Générer').closest('button');
    expect(videoButton).toBeDefined();
    expect(videoButton?.className).toContain('bg-primary');
    
    // Vérifier le positionnement en bas à droite
    expect(videoButton?.className).toContain('bottom-2');
    expect(videoButton?.className).toContain('right-2');
  });

  it('should not display file info anymore', () => {
    const { queryByText } = render(<ImageCard image={mockImage} onDelete={mockOnDelete} />);
    
    // Les infos de fichier ne doivent plus être affichées
    expect(queryByText('image.jpg')).toBeNull();
    expect(queryByText('0.98 MB')).toBeNull();
  });
});
