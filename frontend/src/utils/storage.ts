import type { User } from '../types';

/** Claves de LocalStorage usadas por la aplicación. */
export const STORAGE_KEYS = {
  user: 'sc_user',
  session: 'sc_session',
  balance: 'sc_balance',
  cardData: 'sc_card_data',
  users: 'sc_users',
} as const;

interface StoredUser extends User {
  passwordHash: string;
}

/** Lee y deserializa un valor JSON, devolviendo null si no existe o está corrupto. */
function read<T>(key: string): T | null {
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/** Genera un hash SHA-256 para no guardar contraseñas en texto plano. */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Obtiene todos los usuarios registrados localmente. */
export function getStoredUsers(): StoredUser[] {
  return read<StoredUser[]>(STORAGE_KEYS.users) ?? [];
}

/** Persiste la colección local de usuarios. */
export function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

/** Guarda el perfil activo, la sesión y su saldo inicial/actual. */
export function persistSession(user: User): void {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ userId: user.id, active: true }));
  localStorage.setItem(STORAGE_KEYS.balance, String(user.balance));
}

/** Recupera el perfil activo solo si existe una sesión local activa. */
export function getPersistedSession(): User | null {
  const session = read<{ userId: string; active: boolean }>(STORAGE_KEYS.session);
  const user = read<User>(STORAGE_KEYS.user);
  return session?.active && user?.id === session.userId ? user : null;
}

/**
 * Actualiza el saldo en la sesión activa y en el usuario local correspondiente.
 * El valor recibido del backend se conserva como fuente de verdad entre sesiones.
 */
export function persistBalance(user: User, balance: number): User {
  const updatedUser = { ...user, balance: Number(balance.toFixed(2)) };
  const storedUsers = getStoredUsers();
  const updatedUsers = storedUsers.map((storedUser) =>
    storedUser.id === user.id
      ? { ...storedUser, balance: updatedUser.balance }
      : storedUser,
  );

  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
  localStorage.setItem(STORAGE_KEYS.balance, String(updatedUser.balance));
  saveStoredUsers(updatedUsers);
  return updatedUser;
}

/** Guarda únicamente los datos ficticios y enmascarados devueltos por SnailPay. */
export function persistCardData(cardNumber: string, cvv: string): void {
  localStorage.setItem(STORAGE_KEYS.cardData, JSON.stringify({ cardNumber, cvv }));
}

/** Elimina la sesión local sin borrar el registro del usuario para permitir volver a iniciar sesión. */
export function clearPersistedSession(): void {
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.session);
  localStorage.removeItem(STORAGE_KEYS.balance);
}
