import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaUploader } from './MediaUploader';

describe('MediaUploader', () => {
  it('should render upload zone', () => {
    const onFileSelect = vi.fn();
    
    const { getByText } = render(
      <MediaUploader 
        label="Test Upload" 
        onFileSelect={onFileSelect} 
      />
    );
    
    expect(getByText('Test Upload')).toBeInTheDocument();
    expect(getByText('Cliquer pour uploader')).toBeInTheDocument();
  });

  it('should display preview after file selection', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const { container, findByAltText } = render(
      <MediaUploader 
        label="Test Upload" 
        onFileSelect={onFileSelect} 
      />
    );
    
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    
    // Wait for file to be processed
    await findByAltText('Preview');
    
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('should remove file when remove button clicked', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const { container, findByAltText, queryByAltText } = render(
      <MediaUploader 
        label="Test Upload" 
        onFileSelect={onFileSelect} 
      />
    );
    
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    
    // Wait for preview
    const preview = await findByAltText('Preview');
    expect(preview).toBeInTheDocument();
    
    // Click remove button
    const removeButton = container.querySelector('button[type="button"]');
    expect(removeButton).toBeInTheDocument();
    await user.click(removeButton!);
    
    // Preview should be gone
    expect(queryByAltText('Preview')).not.toBeInTheDocument();
    expect(onFileSelect).toHaveBeenCalledWith(null);
  });
});
