import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

// Mock the @sardoba/shared import used by Badge (for StatusBadge/SourceBadge)
jest.mock('@sardoba/shared', () => ({}), { virtual: true });
jest.mock('@/lib/utils/booking-colors', () => ({
  BOOKING_COLORS: {
    new: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'New' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
  },
  SOURCE_COLORS: {
    direct: { bg: 'bg-sardoba-blue/10', text: 'text-sardoba-blue', label: 'Direct' },
  },
}));

describe('Badge', () => {
  // ─── Basic rendering ──────────────────────────────────────────────────

  it('renders with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    render(<Badge>Tag</Badge>);
    const badge = screen.getByText('Tag');
    expect(badge.tagName).toBe('SPAN');
  });

  // ─── Default variant ──────────────────────────────────────────────────

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });

  // ─── Color variants ──────────────────────────────────────────────────

  it('applies success variant styles', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('applies warning variant styles', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge.className).toContain('bg-orange-100');
    expect(badge.className).toContain('text-orange-800');
  });

  it('applies danger variant styles', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText('Danger');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });

  it('applies info variant styles', () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText('Info');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('applies gold variant styles', () => {
    render(<Badge variant="gold">Gold</Badge>);
    const badge = screen.getByText('Gold');
    expect(badge.className).toContain('bg-sardoba-gold/20');
    expect(badge.className).toContain('text-sardoba-gold-dark');
  });

  // ─── Custom variant ──────────────────────────────────────────────────

  it('applies custom bg and text classes', () => {
    render(
      <Badge variant="custom" bg="bg-purple-100" text="text-purple-800">
        Custom
      </Badge>,
    );
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('bg-purple-100');
    expect(badge.className).toContain('text-purple-800');
  });

  // ─── Size variants ───────────────────────────────────────────────────

  it('applies md size by default', () => {
    render(<Badge>Medium</Badge>);
    const badge = screen.getByText('Medium');
    expect(badge.className).toContain('px-2.5');
    expect(badge.className).toContain('py-1');
  });

  it('applies sm size', () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText('Small');
    expect(badge.className).toContain('px-1.5');
    expect(badge.className).toContain('py-0.5');
  });

  // ─── Custom className ─────────────────────────────────────────────────

  it('accepts a custom className', () => {
    render(<Badge className="my-badge">Styled</Badge>);
    const badge = screen.getByText('Styled');
    expect(badge.className).toContain('my-badge');
  });

  // ─── Common styles ───────────────────────────────────────────────────

  it('always includes base styles', () => {
    render(<Badge>Base</Badge>);
    const badge = screen.getByText('Base');
    expect(badge.className).toContain('inline-flex');
    expect(badge.className).toContain('items-center');
    expect(badge.className).toContain('font-medium');
    expect(badge.className).toContain('rounded-full');
  });
});
