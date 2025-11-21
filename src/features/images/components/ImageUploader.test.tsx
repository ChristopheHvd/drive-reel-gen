import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploader } from './ImageUploader';
import * as useImageUploadModule from '../hooks/useImageUpload';

vi.mock('../hooks/useImageUpload');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ImageUploader', () => {
  const mockUploadImages = vi.fn();
  const mockResetProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
      uploadImages: mockUploadImages,
      isUploading: false,
      progress: [],
      error: null,
      resetProgress: mockResetProgress,
    });
  });

  it('should render drag and drop zone', () => {
    const { getByText } = render(<ImageUploader />);
    
    expect(getByText(/Glissez vos images ici/i)).toBeDefined();
    expect(getByText(/JPG, PNG, WEBP, HEIC/i)).toBeDefined();
  });

  it('should trigger upload immediately on file selection', async () => {
    const user = userEvent.setup();
    mockUploadImages.mockResolvedValue([{ id: 'img-1' }]);
    
    const { container } = render(<ImageUploader />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await user.upload(input, file);
    
    // Vérifier que uploadImages a été appelé immédiatement
    expect(mockUploadImages).toHaveBeenCalledWith([file]);
  });

  it('should show upload progress', () => {
    vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
      uploadImages: mockUploadImages,
      isUploading: true,
      progress: [
        { fileName: 'test.jpg', progress: 50, status: 'uploading' },
      ],
      error: null,
      resetProgress: mockResetProgress,
    });
    
    const { getByText } = render(<ImageUploader />);
    
    expect(getByText('test.jpg')).toBeDefined();
    expect(getByText('50%')).toBeDefined();
  });

  it('should display error status in progress', () => {
    vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
      uploadImages: mockUploadImages,
      isUploading: false,
      progress: [
        { fileName: 'test.jpg', progress: 0, status: 'error', error: 'Upload failed' },
      ],
      error: null,
      resetProgress: mockResetProgress,
    });
    
    const { getByText } = render(<ImageUploader />);
    
    expect(getByText('Upload failed')).toBeDefined();
  });

  it('should display success status in progress', () => {
    vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
      uploadImages: mockUploadImages,
      isUploading: false,
      progress: [
        { fileName: 'test.jpg', progress: 100, status: 'success' },
      ],
      error: null,
      resetProgress: mockResetProgress,
    });
    
    const { getByText } = render(<ImageUploader />);
    
    expect(getByText('✓')).toBeDefined();
  });

  it('should trigger upload on drag and drop', async () => {
    mockUploadImages.mockResolvedValue([{ id: 'img-1' }]);
    
    const { container } = render(<ImageUploader />);
    
    const dropZone = container.querySelector('div');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'image/jpeg', getAsFile: () => file }],
      types: ['Files']
    };
    
    if (dropZone) {
      const dropEvent = Object.assign(new Event('drop', { bubbles: true }), { dataTransfer });
      dropZone.dispatchEvent(dropEvent);
      
      expect(mockUploadImages).toHaveBeenCalledWith([file]);
    }
  });
});
