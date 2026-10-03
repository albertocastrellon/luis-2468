// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './Dashboard';

const { authState } = vi.hoisted(() => ({
  authState: {
    user: {
      id: 'user_1',
      fullName: 'ada lovelace',
      email: 'ada@example.com',
      balance: 42.5,
    } as {
      id: string;
      fullName: string;
      email: string;
      balance: number;
    } | null,
    loading: false,
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    authState.user = {
      id: 'user_1',
      fullName: 'ada lovelace',
      email: 'ada@example.com',
      balance: 42.5,
    };
  });

  it('greets the registered user with their full name in title case', () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole('heading', { name: 'Hola, Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  it('shows the current balance formatted with two decimals', () => {
    render(<DashboardPage />);

    expect(screen.getByText('$42.50')).toBeInTheDocument();
  });

  it('labels the snail chart as a six-race simulated day', () => {
    render(<DashboardPage />);

    expect(screen.getByText('6 carreras · Datos simulados')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Victorias registradas por caracol'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Resumen de apuestas ganadas y perdidas'),
    ).toBeInTheDocument();
  });

  it('keeps the welcome section when the name cannot be displayed', () => {
    authState.user = null;
    render(<DashboardPage />);

    expect(screen.queryByRole('heading', { name: /Hola/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('Consulta tu saldo y sigue el rendimiento de tus caracoles favoritos.'),
    ).toBeInTheDocument();
  });

  it('links to the SnailPay recharge screen', () => {
    render(<DashboardPage />);

    expect(
      screen.getAllByRole('link', { name: /Recargar saldo/i })[0],
    ).toHaveAttribute('href', '/dashboard/recharge');
    expect(
      screen.getByRole('link', { name: 'Ver opciones de recarga' }),
    ).toHaveAttribute('href', '/dashboard/recharge');
  });
});
