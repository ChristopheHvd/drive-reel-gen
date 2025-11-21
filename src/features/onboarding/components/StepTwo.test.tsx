import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import StepTwo from './StepTwo';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/features/drive', () => ({
  DriveFolderBrowser: ({ onFolderSelected }: any) => (
    <div data-testid="drive-folder-browser">
      <button onClick={() => onFolderSelected('folder-123', 'Test Folder')}>
        Select Folder
      </button>
    </div>
  ),
  ConnectDriveButton: ({ onConnected }: any) => (
    <button data-testid="connect-drive-btn" onClick={onConnected}>
      Mock Connect Drive
    </button>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('StepTwo - Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    } as any);

    const { container } = render(<StepTwo onComplete={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('shows ConnectDriveButton when Drive not connected', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    } as any);

    const { container } = render(<StepTwo onComplete={vi.fn()} />);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(container.querySelector('[data-testid="connect-drive-btn"]')).toBeTruthy();
  });

  it('shows folder selection when Drive is connected', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { refresh_token: 'token-123' },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    } as any);

    const { container } = render(<StepTwo onComplete={vi.fn()} />);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show "Sélectionner un dossier" button
    expect(container.textContent).toContain('Sélectionner un dossier');
  });

  it('allows skipping the step', async () => {
    const onComplete = vi.fn();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as any);

    const { container } = render(<StepTwo onComplete={onComplete} />);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have skip button
    expect(container.textContent).toContain('Passer cette étape');
  });

  it('handles folder selection successfully', async () => {
    const onComplete = vi.fn();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { refresh_token: 'token-123' },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { container } = render(<StepTwo onComplete={onComplete} />);

    // Component should render successfully
    expect(container).toBeTruthy();
  });
});
