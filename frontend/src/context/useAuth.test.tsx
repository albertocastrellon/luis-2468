// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { EMAIL_EXISTS_MESSAGE, RegistrationError } from '../utils/errors';
import {
  STORAGE_KEYS,
  clearPersistedSession,
  getStoredUsers,
  getPersistedSession,
  hashPassword,
  persistSession,
  saveStoredUsers,
} from '../utils/storage';
import type { User } from '../types';

const { authServiceMock } = vi.hoisted(() => ({
  authServiceMock: {
    register: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({ authService: authServiceMock }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const PASSWORD = 'password123';

async function seedLocalUser(overrides: Partial<User> = {}): Promise<User> {
  const user: User = {
    id: 'user-1',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    balance: 10,
    ...overrides,
  };
  saveStoredUsers([{ ...user, passwordHash: await hashPassword(PASSWORD) }]);
  return user;
}

async function renderAuth() {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('throws a clear error when it is used outside of AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth debe utilizarse dentro de AuthProvider.',
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('exposes the whole auth contract once the provider has bootstrapped', async () => {
    const { result } = await renderAuth();

    expect(result.current.user).toBeNull();
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.refreshUser).toBe('function');
  });

  it('reports loading while the persisted session is being restored', async () => {
    const user = await seedLocalUser();
    persistSession(user);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(user);
  });

  it('stays anonymous when the local session is inactive or mismatched', async () => {
    const user = await seedLocalUser();
    persistSession(user);
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({ userId: 'another-user', active: true }),
    );

    const { result } = await renderAuth();

    expect(result.current.user).toBeNull();
  });

  it('keeps the context value referentially stable between unrelated renders', async () => {
    const { result, rerender } = await renderAuth();
    const firstValue = result.current;

    rerender();
    expect(result.current).toBe(firstValue);
  });

  describe('login', () => {
    it('validates the local credentials, syncs the backend cookie and adopts the backend balance', async () => {
      const localUser = await seedLocalUser();
      authServiceMock.login.mockResolvedValue({
        user: { id: localUser.id, fullName: 'Ada L.', email: 'ada@example.com', balance: 75 },
      });
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.login({ email: 'ada@example.com', password: PASSWORD });
      });

      expect(authServiceMock.login).toHaveBeenCalledTimes(1);
      expect(result.current.user).toEqual({
        id: 'user-1',
        fullName: 'Ada L.',
        email: 'ada@example.com',
        balance: 75,
      });
      expect(getPersistedSession()).toEqual(result.current.user);
      expect(localStorage.getItem(STORAGE_KEYS.balance)).toBe('75');

      const storedUser = getStoredUsers()[0];
      expect(storedUser.passwordHash).toBe(await hashPassword(PASSWORD));
      expect(storedUser.balance).toBe(75);
    });

    it('matches the stored email ignoring case and surrounding whitespace', async () => {
      await seedLocalUser();
      authServiceMock.login.mockResolvedValue({
        user: { id: 'user-1', fullName: 'Ada Lovelace', email: 'ada@example.com', balance: 0 },
      });
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.login({ email: '  ADA@Example.COM ', password: PASSWORD });
      });

      expect(authServiceMock.login).toHaveBeenCalledTimes(1);
      expect(result.current.user?.email).toBe('ada@example.com');
    });

    it('rejects unknown emails without calling the backend', async () => {
      const { result } = await renderAuth();

      await expect(
        result.current.login({ email: 'ghost@example.com', password: PASSWORD }),
      ).rejects.toThrow('Correo o contraseña incorrectos.');

      expect(authServiceMock.login).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(getPersistedSession()).toBeNull();
    });

    it('rejects a wrong password without leaking whether the email exists', async () => {
      await seedLocalUser();
      const { result } = await renderAuth();

      await expect(
        result.current.login({ email: 'ada@example.com', password: 'wrong-password' }),
      ).rejects.toThrow('Correo o contraseña incorrectos.');

      expect(authServiceMock.login).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(getPersistedSession()).toBeNull();
    });

    it('leaves the session untouched when the backend rejects the login', async () => {
      await seedLocalUser();
      authServiceMock.login.mockRejectedValue(new Error('backend down'));
      const { result } = await renderAuth();

      await expect(
        result.current.login({ email: 'ada@example.com', password: PASSWORD }),
      ).rejects.toThrow('backend down');

      expect(result.current.user).toBeNull();
      expect(getPersistedSession()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull();
    });
  });

  describe('register', () => {
    it('blocks a duplicate local email before reaching the backend', async () => {
      await seedLocalUser();
      const { result } = await renderAuth();

      await expect(
        result.current.register({
          fullName: 'Ada Again',
          email: ' ADA@EXAMPLE.COM ',
          password: PASSWORD,
        }),
      ).rejects.toMatchObject({
        name: 'RegistrationError',
        code: 'EMAIL_EXISTS',
      });

      expect(authServiceMock.register).not.toHaveBeenCalled();
      expect(getStoredUsers()).toHaveLength(1);
    });

    it('exposes only the public message for duplicated emails', async () => {
      await seedLocalUser();
      const { result } = await renderAuth();

      const error = await result.current
        .register({ fullName: 'Ada Again', email: 'ada@example.com', password: PASSWORD })
        .then(
          () => null,
          (caught: unknown) => caught,
        );

      expect(error).toBeInstanceOf(RegistrationError);
      expect((error as RegistrationError).message).toBe(EMAIL_EXISTS_MESSAGE);
      expect((error as Error).message).not.toContain('internal');
    });

    it('persists the new account with a hashed password and zero balance without auto-login', async () => {
      authServiceMock.register.mockResolvedValue({
        user: { id: 'user-9', fullName: 'Server Name', email: 'ada@example.com', balance: 42 },
      });
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.register({
          fullName: '  Ada Lovelace ',
          email: ' ADA@EXAMPLE.COM ',
          password: PASSWORD,
        });
      });

      expect(authServiceMock.register).toHaveBeenCalledTimes(1);
      expect(getStoredUsers()).toHaveLength(1);
      expect(getStoredUsers()[0]).toMatchObject({
        id: 'user-9',
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        balance: 0,
        passwordHash: await hashPassword(PASSWORD),
      });
      expect(getStoredUsers()[0].passwordHash).not.toContain(PASSWORD);
      expect(result.current.user).toBeNull();
      expect(getPersistedSession()).toBeNull();
    });
  });

  describe('logout', () => {
    it('revokes the backend cookie and clears the local session but keeps the user registry', async () => {
      const user = await seedLocalUser();
      persistSession(user);
      authServiceMock.logout.mockResolvedValue(undefined);
      const { result } = await renderAuth();
      expect(result.current.user).toEqual(user);

      await act(async () => {
        await result.current.logout();
      });

      expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.balance)).toBeNull();
      expect(getStoredUsers()).toHaveLength(1);
    });

    it('keeps the local session intact when the backend logout fails', async () => {
      const user = await seedLocalUser();
      persistSession(user);
      authServiceMock.logout.mockRejectedValue(new Error('cookie revocation failed'));
      const { result } = await renderAuth();

      await expect(result.current.logout()).rejects.toThrow('cookie revocation failed');
      expect(result.current.user).toEqual(user);
      expect(getPersistedSession()).toEqual(user);
      expect(getStoredUsers()).toHaveLength(1);
    });
  });

  describe('refreshUser', () => {
    it('reloads the session from storage after it changes externally', async () => {
      const user = await seedLocalUser();
      persistSession(user);
      const { result } = await renderAuth();
      expect(result.current.user).toEqual(user);

      const reloaded: User = { ...user, balance: 999 };
      persistSession(reloaded);
      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(reloaded);
    });

    it('drops the in-memory user when the session is removed externally', async () => {
      const user = await seedLocalUser();
      persistSession(user);
      const { result } = await renderAuth();
      expect(result.current.user).toEqual(user);

      clearPersistedSession();
      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toBeNull();
    });
  });
});
