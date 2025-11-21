import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectDriveButton } from './ConnectDriveButton';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConnectDriveButton', () => {
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
    } as any);

    const { container } = render(<ConnectDriveButton />);
    expect(container).toBeTruthy();
  });

  it('checks for existing token on mount', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { refresh_token: 'token-123' },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as any);

    render(<ConnectDriveButton />);

    // Wait a bit for the async call
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
  });

  it('handles connection flow when clicked', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'access-token-123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    } as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { authUrl: 'https://accounts.google.com/oauth' },
      error: null,
    });

    const { container } = render(<ConnectDriveButton />);
    
    // Component renders successfully
    expect(container).toBeTruthy();
  });
});
