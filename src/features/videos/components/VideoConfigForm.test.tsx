import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoConfigForm } from './VideoConfigForm';

describe('VideoConfigForm', () => {
  it('should render all form fields', () => {
    const { getByText, getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    expect(getByText(/mode de génération/i)).toBeInTheDocument();
    expect(getByText(/format de la vidéo/i)).toBeInTheDocument();
    expect(getByText(/entrez le prompt/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /générer une vidéo/i })).toBeInTheDocument();
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

  it('should force 16:9 when mode is situation', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    
    const { getByLabelText } = render(<VideoConfigForm onGenerate={onGenerate} />);
    
    // Sélectionner mode "En situation"
    const situationRadio = getByLabelText('En situation');
    await user.click(situationRadio);
    
    // Vérifier que 16:9 est maintenant sélectionné
    const horizontal = getByLabelText(/16:9 \(Horizontal\)/i);
    expect(horizontal).toBeChecked();
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
