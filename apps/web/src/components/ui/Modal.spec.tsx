import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    defaultProps.onClose.mockClear();
  });

  // ─── Rendering ────────────────────────────────────────────────────────

  it('renders when open is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<Modal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  // ─── Close button ────────────────────────────────────────────────────

  it('calls onClose when clicking the close button', () => {
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Закрыть');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Overlay click ───────────────────────────────────────────────────

  it('calls onClose when clicking the overlay', () => {
    render(<Modal {...defaultProps} />);

    const overlay = screen.getByRole('dialog');
    // Click on the overlay (the dialog container), not the content
    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal content', () => {
    render(<Modal {...defaultProps} />);

    fireEvent.click(screen.getByText('Modal content'));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('does not close on overlay click when closeOnOverlayClick is false', () => {
    render(<Modal {...defaultProps} closeOnOverlayClick={false} />);

    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  // ─── Escape key ──────────────────────────────────────────────────────

  it('calls onClose when pressing Escape', () => {
    render(<Modal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Title ───────────────────────────────────────────────────────────

  it('renders without a title and still has close button', () => {
    render(
      <Modal open={true} onClose={defaultProps.onClose}>
        <p>No title content</p>
      </Modal>,
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.getByText('No title content')).toBeInTheDocument();
    // Close button should still exist (the one in body area)
    expect(screen.getByLabelText('Закрыть')).toBeInTheDocument();
  });

  // ─── Footer ──────────────────────────────────────────────────────────

  it('renders footer content when provided', () => {
    render(
      <Modal {...defaultProps} footer={<button>Save</button>}>
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render footer section when footer is not provided', () => {
    render(<Modal {...defaultProps} />);

    // The footer section has specific classes; since no footer is provided,
    // there should be no button with a generic save/cancel name from footer
    // We verify by checking only the close button exists (no extra footer buttons)
    const buttons = screen.getAllByRole('button');
    // Only the close button should be present (aria-label="Закрыть")
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Закрыть');
  });

  // ─── Aria attributes ─────────────────────────────────────────────────

  it('has correct aria attributes', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('does not set aria-labelledby when title is absent', () => {
    render(
      <Modal open={true} onClose={defaultProps.onClose}>
        <p>Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  // ─── Body overflow ───────────────────────────────────────────────────

  it('sets body overflow to hidden when open', () => {
    render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow when closed', () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal {...defaultProps} open={false} />);
    expect(document.body.style.overflow).toBe('');
  });
});
