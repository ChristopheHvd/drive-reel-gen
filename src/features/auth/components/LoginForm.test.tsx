import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue({ error: null });
  const mockOnGoogleLogin = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('pre-fills email when defaultEmail is provided', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe('invited@example.com');
  });

  it('makes email field read-only when defaultEmail is provided', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput).toHaveAttribute('readonly');
    expect(emailInput).toBeDisabled();
  });

  it('shows lock icon when email is locked', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    // Lock icon should be present (lucide-react Lock component)
    const emailContainer = screen.getByLabelText(/email/i).parentElement;
    expect(emailContainer?.querySelector('svg')).toBeInTheDocument();
  });

  it('allows email editing when no defaultEmail is provided', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput).not.toHaveAttribute('readonly');
    expect(emailInput).not.toBeDisabled();
  });

  it('submits form with pre-filled email', async () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
        defaultEmail="invited@example.com"
      />
    );

    const passwordInput = screen.getByLabelText(/mot de passe/i);
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /se connecter/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('invited@example.com', 'password123');
    });
  });

  it('displays error message on invalid credentials', async () => {
    const mockOnSubmitWithError = vi.fn().mockResolvedValue({
      error: new Error('Invalid login credentials'),
    });

    render(
      <LoginForm
        onSubmit={mockOnSubmitWithError}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    const submitButton = screen.getByRole('button', { name: /se connecter/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email ou mot de passe incorrect/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleLogin={mockOnGoogleLogin}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    // Enter invalid email and password
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Blur the email field to trigger validation
    fireEvent.blur(emailInput);

    // Wait for validation error to appear
    await waitFor(() => {
      expect(screen.getByText(/Email invalide/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Try to submit - should not call onSubmit due to validation failure
    const submitButton = screen.getByRole('button', { name: /se connecter/i });
    fireEvent.click(submitButton);
    
    // Give it a moment to ensure onSubmit is not called
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that onSubmit was not called due to validation failure
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
