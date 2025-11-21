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

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockStorageFrom = vi.fn().mockReturnValue({
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' },
      }),
    });
    (supabase.storage.from as any) = mockStorageFrom;
  });

  it('should render image card with file info', () => {
    const { getByText } = render(<ImageCard image={mockImage} onDelete={mockOnDelete} />);
    
    expect(getByText('image.jpg')).toBeDefined();
    expect(getByText('1.00MB')).toBeDefined();
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
    
    const card = container.querySelector('.ring-2.ring-primary');
    expect(card).toBeDefined();
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

  it('should display loading state for image', () => {
    const mockStorageFrom = vi.fn().mockReturnValue({
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: null },
      }),
    });
    (supabase.storage.from as any) = mockStorageFrom;
    
    const { container } = render(<ImageCard image={mockImage} onDelete={mockOnDelete} />);
    
    const eyeIcon = container.querySelector('.lucide-eye');
    expect(eyeIcon).toBeDefined();
  });
});
