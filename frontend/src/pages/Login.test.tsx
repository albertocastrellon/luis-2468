// @vitest-environment jsdom
import axios, { AxiosHeaders } from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INVALID_CREDENTIALS_MESSAGE,
  NETWORK_ERROR_MESSAGE,
} from '../utils/errors';
import { LoginPage } from './Login';

const { loginMock, navigateMock, sweetAlertMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  navigateMock: vi.fn(),
  sweetAlertMock: vi.fn(),
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}));

vi.mock('sweetalert2', () => ({
  default: { fire: sweetAlertMock },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
    sweetAlertMock.mockReset();
    sweetAlertMock.mockResolvedValue({ isConfirmed: true });
  });

  it('renders the login form and registration link', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Regístrate' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
  });

  it('normalizes email, toggles password visibility and logs in successfully', async () => {
    loginMock.mockResolvedValue(undefined);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ADA@EXAMPLE.COM' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('ada@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');

    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password123',
    }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(sweetAlertMock).not.toHaveBeenCalled();
  });

  it('shows a safe alert and restores the button after a failed login', async () => {
    loginMock.mockRejectedValue(new Error('internal authentication detail'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    await waitFor(() => expect(sweetAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        title: 'No se pudo iniciar sesión',
        text: 'Verifica tu correo y contraseña e intenta de nuevo.',
      }),
    ));
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
  });

  it('blocks native submission when required credentials are missing', async () => {
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(loginMock).not.toHaveBeenCalled();
    expect(sweetAlertMock).not.toHaveBeenCalled();
  });

  it('disables the button while login is pending', async () => {
    let resolveLogin!: () => void;
    loginMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveLogin = resolve;
    }));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cargando' })).toBeDisabled());
    resolveLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
  });

  it('exposes credential-manager attributes and native constraints on both fields', () => {
    render(<LoginPage />);

    const email = screen.getByLabelText('Correo electrónico');
    const password = screen.getByLabelText('Contraseña');

    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toBeRequired();
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toBeRequired();
  });

  it('keeps the typed credentials after a failed attempt so the user can retry', async () => {
    loginMock.mockRejectedValueOnce(new Error('boom'));
    render(<LoginPage />);

    const email = screen.getByLabelText('Correo electrónico');
    const password = screen.getByLabelText('Contraseña');
    fireEvent.change(email, { target: { value: 'Ada@Example.COM' } });
    fireEvent.change(password, { target: { value: 'password123' } });
    fireEvent.submit(email.closest('form')!);

    await waitFor(() => expect(sweetAlertMock).toHaveBeenCalled());

    expect(loginMock).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password123',
    });
    expect(email).toHaveValue('ada@example.com');
    expect(password).toHaveValue('password123');
    expect(password).toHaveAttribute('type', 'password');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('translates a backend INVALID_CREDENTIALS response into the public message', async () => {
    loginMock.mockRejectedValue(
      new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'bcrypt.compare failed for user id=42',
            stack: 'secret internal stack trace',
          },
        },
      }),
    );
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    await waitFor(() => expect(sweetAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: INVALID_CREDENTIALS_MESSAGE }),
    ));

    const alertOptions = sweetAlertMock.mock.calls[0][0];
    expect(alertOptions.text).not.toContain('bcrypt.compare');
    expect(alertOptions.text).not.toContain('secret internal stack trace');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('advises checking the connection when the backend never responds', async () => {
    loginMock.mockRejectedValue(new axios.AxiosError('Network Error', 'ERR_NETWORK'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    await waitFor(() => expect(sweetAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: NETWORK_ERROR_MESSAGE }),
    ));
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
  });

  it('configures the failure alert with the dark theme and branded confirm button', async () => {
    loginMock.mockRejectedValue(new Error('boom'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    await waitFor(() => expect(sweetAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'dark',
        icon: 'error',
        title: 'No se pudo iniciar sesión',
        showConfirmButton: true,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#98FF98',
        customClass: { confirmButton: '!font-bold !text-ink' },
      }),
    ));
  });

  it('shows a spinner inside the button while the request is pending', async () => {
    let resolveLogin!: () => void;
    loginMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveLogin = resolve;
    }));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    const pendingButton = await screen.findByRole('button', { name: 'Cargando' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).not.toHaveAccessibleName(/iniciar sesión/i);

    resolveLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
  });

  it('ignores clicks on the disabled button so login is only sent once', async () => {
    let resolveLogin!: () => void;
    loginMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveLogin = resolve;
    }));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    fireEvent.click(submitButton);
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    expect(loginMock).toHaveBeenCalledTimes(1);

    resolveLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
  });
});
