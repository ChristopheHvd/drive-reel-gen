import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoConfigForm } from './VideoConfigForm';

describe('VideoConfigForm', () => {
  it('should render all form fields', async () => {
    const { getByText, getByRole, getByLabelText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Prompt field
    expect(getByLabelText(/prompt de génération/i)).toBeInTheDocument();
    
    // Boutons de génération de prompt IA
    expect(getByText(/situation/i)).toBeInTheDocument();
    expect(getByText(/produit/i)).toBeInTheDocument();
    expect(getByText(/témoignage/i)).toBeInTheDocument();
    
    // Bouton submit
    expect(getByRole('button', { name: /générer une vidéo/i })).toBeInTheDocument();
    
    // Options avancées collapsées
    expect(getByText(/options avancées/i)).toBeInTheDocument();
  });

  it('should have prompt field visible by default', () => {
    const { getByLabelText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const promptField = getByLabelText(/prompt de génération/i);
    expect(promptField).toBeInTheDocument();
  });

  it('should have 9:16 as default aspect ratio', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Ouvrir les options avancées pour voir l'aspect ratio
    await user.click(getByText(/options avancées/i));
    
    const vertical = getByLabelText(/9:16 \(Vertical - Instagram Reels\)/i);
    expect(vertical).toBeChecked();
  });

  it('should enable submit button with default prompt', () => {
    const { getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Le prompt a une valeur par défaut, donc le bouton devrait être enabled
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should disable submit button when prompt is cleared', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText, getByRole } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Effacer le prompt
    const promptInput = getByPlaceholderText(/décrivez la vidéo/i);
    await user.clear(promptInput);
    
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    expect(submitButton).toBeDisabled();
  });

  it('should call onGenerate with correct config on submit', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    
    const { getByPlaceholderText, getByRole } = render(<VideoConfigForm onGenerate={onGenerate} />);
    
    // Modifier le prompt (clear puis type pour remplacer le défaut)
    const promptInput = getByPlaceholderText(/décrivez la vidéo/i);
    await user.clear(promptInput);
    await user.type(promptInput, 'Test prompt');
    
    // Soumettre
    const submitButton = getByRole('button', { name: /générer une vidéo/i });
    await user.click(submitButton);
    
    expect(onGenerate).toHaveBeenCalledWith({
      prompt: 'Test prompt',
      aspectRatio: '9:16',
      logoFile: undefined,
      additionalImageFile: undefined,
    });
  });

  it('should allow switching aspect ratio in advanced options', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    // Ouvrir options avancées
    await user.click(getByText(/options avancées/i));
    
    // Vérifier que 9:16 est sélectionné par défaut
    const vertical = getByLabelText(/9:16 \(Vertical - Instagram Reels\)/i);
    expect(vertical).toBeChecked();
    
    // Vérifier qu'on peut sélectionner 16:9 manuellement
    const horizontal = getByLabelText(/16:9 \(Horizontal - Paysage\)/i);
    expect(horizontal).not.toBeDisabled();
  });

  it('should have 9:16 as default in collapsed advanced options', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const { getByRole } = render(<VideoConfigForm onGenerate={onGenerate} />);
    
    // Soumettre avec les valeurs par défaut (sans ouvrir les options avancées)
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

  it('should have textarea with 6 rows', () => {
    const { getByPlaceholderText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const textarea = getByPlaceholderText(/décrivez la vidéo/i) as HTMLTextAreaElement;
    expect(textarea.rows).toBe(6);
  });

  it('should allow textarea to be resized vertically', () => {
    const { getByPlaceholderText } = render(<VideoConfigForm onGenerate={vi.fn()} />);
    
    const textarea = getByPlaceholderText(/décrivez la vidéo/i);
    expect(textarea.className).toContain('resize-y');
  });
});
