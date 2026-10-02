// @vitest-environment jsdom
import axios, { AxiosHeaders } from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './Register';
import {
  EMAIL_EXISTS_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  VALIDATION_ERROR_MESSAGE,
  RegistrationError,
  getApiError,
} from '../utils/errors';

describe('registration error handling', () => {
  it('uses a clear public message for local duplicate emails', () => {
    expect(
      getApiError(new RegistrationError('EMAIL_EXISTS', 'internal duplicate detail')),
    ).toBe(EMAIL_EXISTS_MESSAGE);
  });

  it('uses the same safe message for backend duplicate responses', () => {
    const error = new axios.AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Este correo ya está registrado.',
          passwordHash: 'must-not-be-shown',
        },
      },
    });

    expect(getApiError(error)).toBe(EMAIL_EXISTS_MESSAGE);
    expect(getApiError(error)).not.toContain('must-not-be-shown');
  });
});

const { registerMock, navigateMock, sweetAlertMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  navigateMock: vi.fn(),
  sweetAlertMock: vi.fn(),
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ register: registerMock }),
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

function axiosError(status: number, data?: unknown) {
  return new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });
}

const VALID = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'password123',
};

function fillValidForm(
  overrides: Partial<typeof VALID> & { confirmPassword?: string } = {},
) {
  const password = overrides.password ?? VALID.password;
  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: overrides.fullName ?? VALID.fullName },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: overrides.email ?? VALID.email },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: overrides.confirmPassword ?? password },
  });
}

function submitForm() {
  fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }).closest('form')!);
}

describe('RegisterPage', () => {
  beforeEach(() => {
    registerMock.mockReset();
    navigateMock.mockReset();
    sweetAlertMock.mockReset();
    sweetAlertMock.mockResolvedValue({ isConfirmed: true });
  });

  describe('rendering', () => {
    it('renders the form, its constraints and the login link', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/');

      const fullName = screen.getByLabelText('Nombre completo');
      expect(fullName).toBeRequired();
      expect(fullName).toHaveAttribute('autocomplete', 'name');
      expect(fullName).toHaveAttribute('pattern', '[A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+)*');

      const email = screen.getByLabelText('Correo electrónico');
      expect(email).toBeRequired();
      expect(email).toHaveAttribute('type', 'email');
      expect(email).toHaveAttribute('autocomplete', 'email');

      const password = screen.getByLabelText('Contraseña');
      expect(password).toBeRequired();
      expect(password).toHaveAttribute('minlength', '8');
      expect(password).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    });

    it('toggles visibility independently for both password fields', () => {
      render(<RegisterPage />);

      expect(screen.getAllByRole('button', { name: 'Mostrar contraseña' })).toHaveLength(2);

      fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0]);
      expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('type', 'password');

      fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0]);
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');

      fireEvent.click(screen.getAllByRole('button', { name: 'Ocultar contraseña' })[0]);
      expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('type', 'text');

      fireEvent.click(screen.getAllByRole('button', { name: 'Ocultar contraseña' })[0]);
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('type', 'password');
    });
  });

  describe('field normalization', () => {
    it('uppercases the full name and strips digits and symbols', () => {
      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('Nombre completo'), {
        target: { value: 'ada lovelace123!' },
      });

      expect(screen.getByLabelText('Nombre completo')).toHaveValue('ADA LOVELACE');
    });

    it('lowercases the email and removes disallowed characters', () => {
      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('Correo electrónico'), {
        target: { value: 'ADA Lovelace@Example.COM' },
      });

      expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
        'adalovelace@example.com',
      );
    });

    it('keeps the passwords exactly as typed', () => {
      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('Contraseña'), {
        target: { value: 'SeCrEt123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'SeCrEt123' },
      });

      expect(screen.getByLabelText('Contraseña')).toHaveValue('SeCrEt123');
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('SeCrEt123');
    });
  });

  describe('client-side validation', () => {
    it('lets the browser block the submission while required fields are empty', async () => {
      render(<RegisterPage />);

      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(registerMock).not.toHaveBeenCalled();
      expect(sweetAlertMock).not.toHaveBeenCalled();
      expect(screen.queryByText(/solo puede contener letras/)).not.toBeInTheDocument();
    });

    it('rejects a full name with consecutive spaces before reaching the backend', () => {
      render(<RegisterPage />);
      fillValidForm({ fullName: 'Ada  Lovelace' });

      submitForm();

      expect(screen.getByText('El nombre completo solo puede contener letras y espacios.')).toBeInTheDocument();
      expect(registerMock).not.toHaveBeenCalled();
      expect(sweetAlertMock).not.toHaveBeenCalled();
    });

    it('rejects an email without a domain part before reaching the backend', () => {
      render(<RegisterPage />);
      fillValidForm({ email: 'ada@example' });

      submitForm();

      expect(screen.getByText('Introduce un correo electrónico válido.')).toBeInTheDocument();
      expect(registerMock).not.toHaveBeenCalled();
      expect(sweetAlertMock).not.toHaveBeenCalled();
    });

    it('rejects mismatched passwords before reaching the backend', () => {
      render(<RegisterPage />);
      fillValidForm({ confirmPassword: 'otra-contraseña' });

      submitForm();

      expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
      expect(registerMock).not.toHaveBeenCalled();
      expect(sweetAlertMock).not.toHaveBeenCalled();
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('clears the inline error once the form becomes valid again', async () => {
      registerMock.mockResolvedValue(undefined);
      render(<RegisterPage />);

      fillValidForm({ confirmPassword: 'otra-contraseña' });
      submitForm();
      expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: VALID.password },
      });
      submitForm();

      await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('Las contraseñas no coinciden.')).not.toBeInTheDocument();
    });

    it('accepts accented letters and Ñ as a valid full name', async () => {
      registerMock.mockResolvedValue(undefined);
      render(<RegisterPage />);

      fillValidForm({ fullName: 'Ángela Ñoño' });
      submitForm();

      await waitFor(() =>
        expect(registerMock).toHaveBeenCalledWith({
          fullName: 'ÁNGELA ÑOÑO',
          email: VALID.email,
          password: VALID.password,
        }),
      );
    });
  });

  describe('successful registration', () => {
    it('registers the normalized payload, confirms the account and then navigates to login', async () => {
      registerMock.mockResolvedValue(undefined);
      render(<RegisterPage />);

      fillValidForm({ fullName: 'Ada Lovelace', email: 'ADA@EXAMPLE.COM' });
      submitForm();

      await waitFor(() =>
        expect(registerMock).toHaveBeenCalledWith({
          fullName: 'ADA LOVELACE',
          email: 'ada@example.com',
          password: VALID.password,
        }),
      );
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true }));

      expect(sweetAlertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          icon: 'success',
          title: 'Cuenta creada correctamente',
          text: 'Ya puedes iniciar sesión con tu correo y contraseña.',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#98FF98',
          customClass: { confirmButton: '!font-bold !text-ink' },
        }),
      );
    });

    it('waits for the confirmation dialog before leaving the page', async () => {
      registerMock.mockResolvedValue(undefined);
      let resolveAlert!: (value: unknown) => void;
      sweetAlertMock.mockReturnValue(
        new Promise((resolve) => {
          resolveAlert = resolve;
        }),
      );
      render(<RegisterPage />);

      fillValidForm();
      submitForm();

      await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
      expect(navigateMock).not.toHaveBeenCalled();

      resolveAlert({ isConfirmed: true });
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true }));
    });

    it('disables the button with a spinner while the request is pending', async () => {
      let resolveRegister!: () => void;
      registerMock.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveRegister = resolve;
        }),
      );
      render(<RegisterPage />);

      fillValidForm();
      submitForm();

      const pendingButton = await screen.findByRole('button', { name: 'Cargando' });
      expect(pendingButton).toBeDisabled();

      resolveRegister();
      await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
    });
  });

  describe('backend errors', () => {
    const backendErrorCases: {
      name: string;
      error: unknown;
      expected: string;
    }[] = [
      {
        name: 'a locally detected duplicate email',
        error: new RegistrationError('EMAIL_EXISTS', 'internal duplicate detail'),
        expected: EMAIL_EXISTS_MESSAGE,
      },
      {
        name: 'a backend 409 with the EMAIL_EXISTS code',
        error: axiosError(409, {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'unique index on users.email violated',
            passwordHash: 'must-not-be-shown',
          },
        }),
        expected: EMAIL_EXISTS_MESSAGE,
      },
      {
        name: 'a backend validation error',
        error: axiosError(400, { error: { code: 'VALIDATION_ERROR' } }),
        expected: VALIDATION_ERROR_MESSAGE,
      },
      {
        name: 'a rate limit without an explicit code',
        error: axiosError(429, {}),
        expected: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      },
      {
        name: 'an unreachable backend',
        error: new axios.AxiosError('Network Error', 'ERR_NETWORK'),
        expected: NETWORK_ERROR_MESSAGE,
      },
      {
        name: 'an unexpected server failure',
        error: new Error('database exploded'),
        expected: 'Intenta nuevamente con tus datos.',
      },
    ];

    it.each(backendErrorCases)(
      'shows the public message for $name',
      async ({ error, expected }) => {
        registerMock.mockRejectedValue(error);
        render(<RegisterPage />);

        fillValidForm();
        submitForm();

        await waitFor(() =>
          expect(sweetAlertMock).toHaveBeenCalledWith(
            expect.objectContaining({
              theme: 'dark',
              icon: 'error',
              title: 'No pudimos crear la cuenta',
              confirmButtonText: 'Entendido',
              text: expected,
            }),
          ),
        );
        expect(navigateMock).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
      },
    );

    it('never leaks internal payload details into the alert', async () => {
      registerMock.mockRejectedValue(
        axiosError(409, {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'unique index on users.email violated',
            passwordHash: 'must-not-be-shown',
            stack: 'sequelize query internal trace',
          },
        }),
      );
      render(<RegisterPage />);

      fillValidForm();
      submitForm();

      await waitFor(() => expect(sweetAlertMock).toHaveBeenCalled());
      const alertOptions = sweetAlertMock.mock.calls[0][0];
      expect(alertOptions.text).toBe(EMAIL_EXISTS_MESSAGE);
      expect(alertOptions.text).not.toContain('must-not-be-shown');
      expect(alertOptions.text).not.toContain('sequelize');
    });
  });
});
