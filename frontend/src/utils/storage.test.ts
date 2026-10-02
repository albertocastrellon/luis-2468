// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../types';
import {
  clearPersistedSession,
  getPersistedSession,
  getStoredUsers,
  hashPassword,
  persistBalance,
  persistCardData,
  persistSession,
  saveStoredUsers,
  STORAGE_KEYS,
} from './storage';

describe('balance persistence', () => {
  const user: User = {
    id: 'user-1',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    balance: 0,
  };

  beforeEach(() => {
    localStorage.clear();
    saveStoredUsers([{ ...user, passwordHash: 'hash-value' }]);
  });

  it('keeps the backend balance synchronized across all local representations', () => {
    const updatedUser = persistBalance(user, 125.678);
    const storedUser = getStoredUsers()[0];

    expect(updatedUser.balance).toBe(125.68);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.user) ?? '{}').balance).toBe(125.68);
    expect(localStorage.getItem(STORAGE_KEYS.balance)).toBe('125.68');
    expect(storedUser.balance).toBe(125.68);
    expect(storedUser.passwordHash).toBe('hash-value');
  });

  it('keeps the persisted balance stable when the same update is applied again', () => {
    persistBalance(user, 250);
    const updatedUser = persistBalance({ ...user, balance: 250 }, 250);

    expect(updatedUser.balance).toBe(250);
    expect(getStoredUsers()[0].balance).toBe(250);
    expect(localStorage.getItem(STORAGE_KEYS.balance)).toBe('250');
  });

  it('restores only a matching active session', () => {
    persistSession(user);
    expect(getPersistedSession()).toEqual(user);

    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ userId: 'other', active: true }));
    expect(getPersistedSession()).toBeNull();

    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ userId: user.id, active: false }));
    expect(getPersistedSession()).toBeNull();
  });

  it('clears session data without removing the registered user list', () => {
    persistSession(user);
    persistCardData('****1234', '***');
    clearPersistedSession();

    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.balance)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.cardData)).not.toBeNull();
    expect(getStoredUsers()).toHaveLength(1);
  });

  it('removes corrupted JSON and hashes passwords without storing plaintext', async () => {
    localStorage.setItem(STORAGE_KEYS.user, '{invalid-json');
    expect(getPersistedSession()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull();

    const hash = await hashPassword('password123');
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('password123');
  });
});
