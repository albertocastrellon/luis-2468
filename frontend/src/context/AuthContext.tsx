import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';
import { AuthContext, type AuthContextValue } from './contextValue';
import { RegistrationError } from '../utils/errors';
import { getPersistedSession, getStoredUsers, hashPassword, persistSession, saveStoredUsers, clearPersistedSession } from '../utils/storage';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** Recupera la sesión y el perfil desde LocalStorage al recargar la aplicación. */
  const refreshUser = async () => {
    const persistedUser = getPersistedSession();
    setUser(persistedUser);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };
    void loadUser();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    /** Registra la cuenta sin activar una sesión local ni backend. */
    register: async (payload) => {
      const users = getStoredUsers();
      const email = payload.email.trim().toLowerCase();
      if (users.some((storedUser) => storedUser.email === email)) {
        throw new RegistrationError('EMAIL_EXISTS', 'Este correo ya está registrado.');
      }

      const passwordHash = await hashPassword(payload.password);
      const response = await authService.register(payload);
      const localUser = {
        ...response.user,
        fullName: payload.fullName.trim(),
        email,
        passwordHash,
        balance: 0,
      };
      saveStoredUsers([...users, localUser]);
    },
    /** Valida las credenciales locales y sincroniza la cookie de autorización del backend. */
    login: async (payload) => {
      const passwordHash = await hashPassword(payload.password);
      const localUser = getStoredUsers().find(
        (storedUser) =>
          storedUser.email === payload.email.trim().toLowerCase() &&
          storedUser.passwordHash === passwordHash,
      );
      if (!localUser) throw new Error('Correo o contraseña incorrectos.');

      const response = await authService.login(payload);
      // El backend es la fuente de verdad del saldo; el LocalStorage solo conserva la sesión.
      const publicUser = {
        ...response.user,
        fullName: response.user.fullName || localUser.fullName,
        email: response.user.email || localUser.email,
      };
      persistSession(publicUser);
      saveStoredUsers(
        getStoredUsers().map((storedUser) =>
          storedUser.id === publicUser.id
            ? { ...storedUser, ...publicUser, passwordHash: storedUser.passwordHash }
            : storedUser,
        ),
      );
      setUser(publicUser);
    },
    /** Cierra la sesión local y revoca también la cookie del backend. */
    logout: async () => {
      await authService.logout();
      clearPersistedSession();
      setUser(null);
    },
    refreshUser,
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
