import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './authService';
import { api } from './api';
import { paymentService } from './paymentService';

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('frontend API services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends registration and login through the authenticated API client', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
      .mockResolvedValueOnce({ data: { user: { id: 'user-1', balance: 75 } } });

    await authService.register({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' });
    const login = await authService.login({ email: 'ada@example.com', password: 'password123' });

    expect(api.post).toHaveBeenNthCalledWith(1, '/auth/register', {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    });
    expect(api.post).toHaveBeenNthCalledWith(2, '/auth/login', {
      email: 'ada@example.com',
      password: 'password123',
    });
    expect(login.user.balance).toBe(75);
  });

  it('gets the active user and logs out through the API', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    await authService.me();
    await authService.logout();

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('sends payment data and appends the system-error simulation only when requested', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { payment: { status: 'approved' } } });
    const payload = {
      cardNumber: '1234123412341234',
      expirationDate: '12/26',
      cvv: '543',
      fullName: 'Ada Lovelace',
      amount: 100,
    };

    await paymentService.pay(payload);
    await paymentService.pay(payload, true);

    expect(api.post).toHaveBeenNthCalledWith(1, '/snailpay/pay', payload);
    expect(api.post).toHaveBeenNthCalledWith(2, '/snailpay/pay?simulate_error=true', payload);
  });
});
