import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire click when disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Click
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('is disabled when loading is true', () => {
    render(<Button loading>Save</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows spinner SVG when loading', () => {
    const { container } = render(<Button loading>Save</Button>);

    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders children text alongside the button', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Save');
  });

  // ─── Variant tests ──────────────────────────────────────────────────────

  it('applies primary variant styles by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-sardoba-gold');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-sardoba-blue');
  });

  it('applies outline variant styles', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border');
    expect(button.className).toContain('bg-white');
  });

  it('applies ghost variant styles', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-gray-600');
  });

  it('applies danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-red-600');
  });

  // ─── Size tests ─────────────────────────────────────────────────────────

  it('applies md size styles by default', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
  });

  it('applies sm size styles', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-3');
    expect(button.className).toContain('py-1.5');
  });

  it('applies lg size styles', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('py-2.5');
  });

  // ─── Icon support ───────────────────────────────────────────────────────

  it('renders with an icon', () => {
    render(
      <Button icon={<span data-testid="icon">+</span>}>Add</Button>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Add');
  });

  it('does not render icon when loading', () => {
    render(
      <Button loading icon={<span data-testid="icon">+</span>}>
        Add
      </Button>,
    );
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  // ─── Custom className ─────────────────────────────────────────────────

  it('accepts a custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  // ─── Ref forwarding ──────────────────────────────────────────────────────

  it('forwards ref to the button element', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
