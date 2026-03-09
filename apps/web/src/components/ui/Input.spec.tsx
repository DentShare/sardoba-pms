import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  // ─── Basic rendering ──────────────────────────────────────────────────

  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with a label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('associates label with input via generated id', () => {
    render(<Input label="Full Name" />);
    const input = screen.getByLabelText('Full Name');
    expect(input).toHaveAttribute('id', 'full-name');
  });

  it('uses custom id when provided', () => {
    render(<Input label="Email" id="custom-email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'custom-email');
  });

  // ─── Change events ───────────────────────────────────────────────────

  it('handles change events', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@email.com' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('allows typing text', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');
    expect(handleChange).toHaveBeenCalledTimes(5); // one per character
  });

  // ─── Error state ──────────────────────────────────────────────────────

  it('shows error message when error prop is provided', () => {
    render(<Input label="Email" error="Invalid email address" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address');
  });

  it('applies error styles to input when error is present', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.className).toContain('border-red-500');
  });

  it('sets aria-describedby to error element id', () => {
    render(<Input label="Email" error="Required field" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
  });

  // ─── Hint text ────────────────────────────────────────────────────────

  it('shows hint text when provided', () => {
    render(<Input label="Email" hint="We won't share your email" />);
    expect(screen.getByText("We won't share your email")).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    render(
      <Input label="Email" hint="Helpful text" error="Error text" />,
    );
    expect(screen.queryByText('Helpful text')).not.toBeInTheDocument();
    expect(screen.getByText('Error text')).toBeInTheDocument();
  });

  it('sets aria-describedby to hint element id when no error', () => {
    render(<Input label="Email" hint="Enter your email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint');
  });

  // ─── Required ─────────────────────────────────────────────────────────

  it('shows required asterisk when required', () => {
    const { container } = render(<Input label="Email" required />);
    const asterisk = container.querySelector('.text-red-500');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveTextContent('*');
  });

  // ─── Disabled ─────────────────────────────────────────────────────────

  it('can be disabled', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  // ─── Placeholder ──────────────────────────────────────────────────────

  it('renders with placeholder text', () => {
    render(<Input placeholder="Enter value..." />);
    expect(screen.getByPlaceholderText('Enter value...')).toBeInTheDocument();
  });

  // ─── Icons ────────────────────────────────────────────────────────────

  it('renders left icon', () => {
    render(
      <Input leftIcon={<span data-testid="left-icon">L</span>} />,
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    render(
      <Input rightIcon={<span data-testid="right-icon">R</span>} />,
    );
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  // ─── Addon ────────────────────────────────────────────────────────────

  it('renders addon text', () => {
    render(<Input addon="https://" />);
    expect(screen.getByText('https://')).toBeInTheDocument();
  });

  // ─── Ref forwarding ──────────────────────────────────────────────────

  it('forwards ref to the input element', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement>;
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  // ─── Custom className ─────────────────────────────────────────────────

  it('accepts a custom className', () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('custom-input');
  });
});
