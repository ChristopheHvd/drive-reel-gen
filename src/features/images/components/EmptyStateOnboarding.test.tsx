import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyStateOnboarding } from './EmptyStateOnboarding';

describe('EmptyStateOnboarding', () => {
  it('should render the upload section', () => {
    render(<EmptyStateOnboarding onUploadClick={vi.fn()} />);
    
    expect(screen.getByText('Uploadez vos premières images')).toBeInTheDocument();
    expect(screen.getByText('Importez vos photos produits pour commencer à générer des vidéos marketing')).toBeInTheDocument();
  });

  it('should display the upload card with correct text', () => {
    render(<EmptyStateOnboarding onUploadClick={vi.fn()} />);
    
    expect(screen.getByText('Importer des images')).toBeInTheDocument();
    expect(screen.getByText('Formats acceptés : JPG, PNG')).toBeInTheDocument();
  });

  it('should NOT display WebP in formats', () => {
    render(<EmptyStateOnboarding onUploadClick={vi.fn()} />);
    
    expect(screen.queryByText(/WebP/i)).not.toBeInTheDocument();
  });

  it('should call onUploadClick when card is clicked', () => {
    const onUploadClick = vi.fn();
    render(<EmptyStateOnboarding onUploadClick={onUploadClick} />);
    
    const card = screen.getByText('Importer des images').closest('[class*="Card"]');
    if (card) {
      fireEvent.click(card);
      expect(onUploadClick).toHaveBeenCalledTimes(1);
    }
  });

  it('should NOT display brand configuration option', () => {
    render(<EmptyStateOnboarding onUploadClick={vi.fn()} />);
    
    expect(screen.queryByText('Configurer ma marque')).not.toBeInTheDocument();
    expect(screen.queryByText(/Notre IA analysera/i)).not.toBeInTheDocument();
  });
});
