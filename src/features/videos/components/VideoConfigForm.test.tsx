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
      durationSeconds: 8,
      logoFile: undefined,
      additionalImageFile: undefined,
    });
  });

  it('should have 9:16 as default in collapsed advanced options', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const { getByRole } = render(<VideoConfigForm onGenerate={onGenerate} />);
    
    // Soumettre avec les valeurs par défaut (sans ouvrir les options avancées)
    await user.click(getByRole('button', { name: /générer une vidéo/i }));
    
    // Vérifier que 9:16 et 8s sont utilisés par défaut
    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ 
        aspectRatio: '9:16',
        durationSeconds: 8
      })
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

  describe('Plan restrictions', () => {
    it('should disable 16:9 format for free plan', async () => {
      const user = userEvent.setup();
      const { getByText, getByRole } = render(
        <VideoConfigForm onGenerate={vi.fn()} planType="free" />
      );
      
      // Ouvrir les options avancées
      await user.click(getByText(/options avancées/i));
      
      // Vérifier que 16:9 est désactivé
      const option16_9 = getByRole('radio', { name: /16:9.*horizontal.*youtube/i });
      expect(option16_9).toBeDisabled();
    });

    it('should disable 16s and 24s duration for free plan', async () => {
      const user = userEvent.setup();
      const { getByText, getByRole } = render(
        <VideoConfigForm onGenerate={vi.fn()} planType="free" />
      );
      
      await user.click(getByText(/options avancées/i));
      
      // Vérifier que 16s et 24s sont désactivés
      expect(getByRole('radio', { name: /16 secondes/i })).toBeDisabled();
      expect(getByRole('radio', { name: /24 secondes/i })).toBeDisabled();
    });

    it('should keep 8s duration enabled for free plan', async () => {
      const user = userEvent.setup();
      const { getByText, getByRole } = render(
        <VideoConfigForm onGenerate={vi.fn()} planType="free" />
      );
      
      await user.click(getByText(/options avancées/i));
      
      // 8s doit rester actif
      expect(getByRole('radio', { name: /8 secondes/i })).not.toBeDisabled();
    });

    it('should show "Starter+" badge on restricted options for free plan', async () => {
      const user = userEvent.setup();
      const { getByText, getAllByText } = render(
        <VideoConfigForm onGenerate={vi.fn()} planType="free" />
      );
      
      await user.click(getByText(/options avancées/i));
      
      // Vérifier la présence des badges Starter+
      const badges = getAllByText('Starter+');
      expect(badges.length).toBeGreaterThanOrEqual(3); // 16s, 24s, 16:9
    });

    it('should enable all options for paid plans', async () => {
      const user = userEvent.setup();
      const { getByText, getByRole } = render(
        <VideoConfigForm onGenerate={vi.fn()} planType="starter" />
      );
      
      await user.click(getByText(/options avancées/i));
      
      // Toutes les options doivent être actives
      expect(getByRole('radio', { name: /16:9.*horizontal.*youtube/i })).not.toBeDisabled();
      expect(getByRole('radio', { name: /16 secondes/i })).not.toBeDisabled();
      expect(getByRole('radio', { name: /24 secondes/i })).not.toBeDisabled();
    });

    it('should force 9:16 and 8s when submitting with free plan', async () => {
      const user = userEvent.setup();
      const onGenerate = vi.fn();
      const { getByRole } = render(
        <VideoConfigForm onGenerate={onGenerate} planType="free" />
      );
      
      await user.click(getByRole('button', { name: /générer une vidéo/i }));
      
      expect(onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          aspectRatio: '9:16',
          durationSeconds: 8,
        })
      );
    });
  });
});
