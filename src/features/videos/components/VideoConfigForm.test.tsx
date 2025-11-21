import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoConfigForm } from './VideoConfigForm';

describe('VideoConfigForm', () => {
  it('should render all form fields', async () => {
    const user = userEvent.setup();
    const { getByText, getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Vérifier champs visibles par défaut
    expect(getByText(/mode de génération/i)).toBeInTheDocument();
    expect(getByText(/entrez le prompt/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /générer une vidéo/i })).toBeInTheDocument();
    
    // Options avancées (collapsées par défaut)
    expect(getByText(/options avancées/i)).toBeInTheDocument();
    
    // Ouvrir les options avancées
    await user.click(getByText(/options avancées/i));
    
    // Format maintenant visible
    expect(getByText(/format de la vidéo/i)).toBeInTheDocument();
  });

  it('should have packshot as default mode', () => {
    const { getByLabelText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const packshot = getByLabelText('Packshot');
    expect(packshot).toBeChecked();
  });

  it('should have 9:16 as default aspect ratio', () => {
    const { getByLabelText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const vertical = getByLabelText(/9:16 \(Vertical\)/i);
    expect(vertical).toBeChecked();
  });

  it('should disable submit button when prompt is empty', () => {
    const { getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when prompt is filled', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText, getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const promptInput = getByPlaceholderText(/décrivez la vidéo/i);
    await user.type(promptInput, 'Test prompt');
    
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onGenerate with correct config on submit', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    
    const { getByPlaceholderText, getByRole } = render(<VideoConfigForm onGenerate={onGenerate} />);
    
    // Remplir le prompt
    const promptInput = getByPlaceholderText(/décrivez la vidéo/i);
    await user.type(promptInput, 'Test prompt');
    
    // Soumettre
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    await user.click(submitButton);
    
    expect(onGenerate).toHaveBeenCalledWith({
      mode: 'packshot',
      prompt: 'Test prompt',
      aspectRatio: '9:16',
    });
  });

  it('should have no restrictions between mode and aspect ratio', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Ouvrir options avancées
    await user.click(getByText(/options avancées/i));
    
    // Sélectionner "En situation"
    await user.click(getByLabelText('En situation'));
    
    // Vérifier que 9:16 est toujours sélectionné (pas de changement forcé)
    const vertical = getByLabelText(/9:16 \(Vertical\)/i);
    expect(vertical).toBeChecked();
    
    // Vérifier qu'on peut sélectionner 16:9 manuellement
    const horizontal = getByLabelText(/16:9 \(Horizontal\)/i);
    expect(horizontal).not.toBeDisabled();
  });

  it('should have 9:16 as default in collapsed advanced options', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const { getByPlaceholderText, getByRole } = render(<VideoConfigForm onGenerate={onGenerate} />);
    
    // Remplir prompt sans toucher aux options avancées
    await user.type(getByPlaceholderText(/décrivez la vidéo/i), 'Test');
    
    // Soumettre
    await user.click(getByRole('button', { name: /générer une vidéo/i }));
    
    // Vérifier que 9:16 est utilisé par défaut
    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ aspectRatio: '9:16' })
    );
  });

  it('should disable form when disabled prop is true', () => {
    const { getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} disabled={true} />);
    
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading state when loading prop is true', () => {
    const { getByText } = render(<VideoConfigForm onGenerate={vi.fn()} loading={true} />);
    
    expect(getByText(/génération en cours/i)).toBeInTheDocument();
  });
});
