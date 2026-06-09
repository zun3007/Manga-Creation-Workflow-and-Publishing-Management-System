import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders children when open=true', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders nothing when open=false', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('has role=dialog and aria-modal=true', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('sets aria-label from title prop', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm Action">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Confirm Action');
  });

  it('sets aria-labelledby from labelledBy prop', () => {
    render(
      <Modal open={true} onClose={vi.fn()} labelledBy="custom-id">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'custom-id');
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('does NOT call onClose when clicking inside content', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <button>Inner button</button>
      </Modal>
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('focuses first focusable element on open', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <button>First</button>
        <button>Second</button>
      </Modal>
    );
    const firstButton = screen.getByRole('button', { name: 'First' });
    expect(firstButton).toHaveFocus();
  });

  it('locks document.body overflow when open', () => {
    const { rerender } = render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(document.body.style.overflow).not.toBe('hidden');

    rerender(
      <Modal open={true} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
