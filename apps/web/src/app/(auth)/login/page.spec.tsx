import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockLogin = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    logout: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockPush.mockClear();
  });

  // ─── Rendering ────────────────────────────────────────────────────────

  it('renders the login form', () => {
    render(<LoginPage />);

    expect(screen.getByText('Вход в систему')).toBeInTheDocument();
    expect(screen.getByText('Введите ваши данные для входа')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('renders email input with correct type and placeholder', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'admin@hotel.uz');
  });

  it('renders password input with correct type', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Пароль');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('placeholder', 'Введите пароль');
  });

  // ─── Validation ──────────────────────────────────────────────────────

  it('shows error when submitting with empty fields', async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: 'Войти' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Заполните все поля')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error when submitting with only email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@test.com');

    const submitButton = screen.getByRole('button', { name: 'Войти' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Заполните все поля')).toBeInTheDocument();
    });
  });

  it('shows error when submitting with only password', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Пароль');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: 'Войти' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Заполните все поля')).toBeInTheDocument();
    });
  });

  // ─── Successful submission ───────────────────────────────────────────

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'admin@hotel.uz');
    await user.type(screen.getByLabelText('Пароль'), 'password123');

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@hotel.uz', 'password123');
    });
  });

  it('redirects to /calendar after successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'admin@hotel.uz');
    await user.type(screen.getByLabelText('Пароль'), 'password123');

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/calendar');
    });
  });

  // ─── Failed submission ───────────────────────────────────────────────

  it('shows API error message on login failure', async () => {
    mockLogin.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Invalid credentials',
          },
        },
      },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'wrong@email.com');
    await user.type(screen.getByLabelText('Пароль'), 'wrongpass');

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows fallback error message when no API error message', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Пароль'), 'pass123');

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument();
    });
  });

  // ─── Loading state ───────────────────────────────────────────────────

  it('disables submit button while loading', async () => {
    // Make login hang (never resolve) to test loading state
    mockLogin.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'admin@hotel.uz');
    await user.type(screen.getByLabelText('Пароль'), 'password123');

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Вход...')).toBeInTheDocument();
    });
  });

  // ─── Password visibility toggle ──────────────────────────────────────

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Пароль');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle button (it has tabIndex -1)
    const toggleButtons = screen.getAllByRole('button');
    // The password toggle button is not the submit button
    const toggleButton = toggleButtons.find(
      (btn) => btn.getAttribute('type') === 'button',
    );
    expect(toggleButton).toBeDefined();

    await user.click(toggleButton!);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton!);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
