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

  it('should handle file selection via input', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<ImageUploader />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    if (input) {
      await user.upload(input, file);
      expect(getByText('test.jpg')).toBeDefined();
    }
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

  it('should call uploadImages when upload button is clicked', async () => {
    const user = userEvent.setup();
    mockUploadImages.mockResolvedValue([{ id: 'img-1' }]);
    
    const { getByText } = render(<ImageUploader />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    if (input) {
      await user.upload(input, file);
      
      const uploadButton = getByText(/Uploader 1 image/i);
      await user.click(uploadButton);
      
      expect(mockUploadImages).toHaveBeenCalled();
    }
  });
});
