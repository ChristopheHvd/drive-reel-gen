import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignupForm } from './SignupForm';

describe('SignupForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue({ error: null });
  const mockOnGoogleLogin = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required fields', () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer mon compte/i })).toBeInTheDocument();
  });

  it('pre-fills email when defaultEmail is provided', () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    expect(emailInput.value).toBe('invited@example.com');
  });

  it('makes email field read-only when defaultEmail is provided', () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    expect(emailInput).toHaveAttribute('readonly');
    expect(emailInput).toBeDisabled();
  });

  it('shows lock icon and helper text when email is locked', () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    // Lock icon should be present
    const emailContainer = screen.getByLabelText(/^email$/i).parentElement;
    expect(emailContainer?.querySelector('svg')).toBeInTheDocument();

    // Helper text should be visible
    expect(screen.getByText(/l'invitation est liée à cet email/i)).toBeInTheDocument();
  });

  it('does not show helper text when no defaultEmail', () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    expect(screen.queryByText(/l'invitation est liée à cet email/i)).not.toBeInTheDocument();
  });

  it('allows email editing when no defaultEmail is provided', () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    expect(emailInput).not.toHaveAttribute('readonly');
    expect(emailInput).not.toBeDisabled();
  });

  it('submits form with pre-filled email', async () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    const fullNameInput = screen.getByLabelText(/nom complet/i);
    const passwordInput = screen.getByLabelText(/^mot de passe$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);

    fireEvent.change(fullNameInput, { target: { value: 'Jean Dupont' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /créer mon compte/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('invited@example.com', 'password123', 'Jean Dupont');
    });
  });

  it('validates password minimum length', async () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const fullNameInput = screen.getByLabelText(/nom complet/i);
    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^mot de passe$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);

    fireEvent.change(fullNameInput, { target: { value: 'Jean Dupont' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });

    const submitButton = screen.getByRole('button', { name: /créer mon compte/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/8 caractères minimum/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    render(
      <SignupForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const fullNameInput = screen.getByLabelText(/nom complet/i);
    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^mot de passe$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);

    fireEvent.change(fullNameInput, { target: { value: 'Jean Dupont' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });

    const submitButton = screen.getByRole('button', { name: /créer mon compte/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument();
    });
  });

  it('displays error message when email already registered', async () => {
    const mockOnSubmitWithError = vi.fn().mockResolvedValue({
      error: new Error('User already registered'),
    });

    render(
      <SignupForm
        onSubmit={mockOnSubmitWithError}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const fullNameInput = screen.getByLabelText(/nom complet/i);
    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^mot de passe$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);

    fireEvent.change(fullNameInput, { target: { value: 'Jean Dupont' } });
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /créer mon compte/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/cet email est déjà utilisé/i)).toBeInTheDocument();
    });
  });
});
