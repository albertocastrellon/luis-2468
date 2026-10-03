// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RechargePage } from './Recharge';

const { authState, navigateMock, payMock, sweetAlertMock } = vi.hoisted(() => ({
  authState: {
    user: {
      id: 'user_1',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      balance: 0,
    } as {
      id: string;
      fullName: string;
      email: string;
      balance: number;
    } | null,
    refreshUser: vi.fn(),
  },
  navigateMock: vi.fn(),
  payMock: vi.fn(),
  sweetAlertMock: vi.fn(),
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('sweetalert2', () => ({
  default: { fire: sweetAlertMock },
}));

vi.mock('../services/paymentService', () => ({
  paymentService: { pay: payMock },
}));

/** Completa el formulario con los datos de la tarjeta aprobada. */
function fillApprovedCard() {
  fireEvent.change(screen.getByLabelText('Número de tarjeta'), {
    target: { value: '1234123412341234' },
  });
  fireEvent.change(screen.getByLabelText('Vencimiento'), {
    target: { value: '12/26' },
  });
  fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '543' } });
}

describe('RechargePage', () => {
  beforeEach(() => {
    authState.refreshUser.mockReset();
    navigateMock.mockReset();
    payMock.mockReset();
    sweetAlertMock.mockReset();
    sweetAlertMock.mockResolvedValue({ isConfirmed: true });
    localStorage.clear();
  });

  it('prefills the cardholder with the registered full name', () => {
    render(<RechargePage />);

    expect(screen.getByLabelText('Nombre del titular')).toHaveValue('ADA LOVELACE');
  });

  it('requests a normal charge when the system-error simulation is off', async () => {
    payMock.mockResolvedValue({
      payment: { status: 'approved', card_number: '****1234', cvv: '***' },
      user: { balance: 250 },
    });
    render(<RechargePage />);
    fillApprovedCard();

    fireEvent.click(screen.getByRole('button', { name: 'Pagar $100.00' }));

    await waitFor(() => expect(payMock).toHaveBeenCalledTimes(1));
    expect(payMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cardNumber: '1234123412341234',
        expirationDate: '12/26',
        cvv: '543',
        fullName: 'ADA LOVELACE',
        amount: 100,
      }),
      false,
    );
    expect(sweetAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'success', title: 'Cobro exitoso' }),
    );
  });

  it('sends the system-error simulation flag when the demo switch is enabled', async () => {
    payMock.mockRejectedValue({
      response: {
        status: 502,
        data: {
          payment: {
            status: 'error',
            status_detail: 'Error de conexión con SnailPay.',
          },
        },
      },
    });
    render(<RechargePage />);
    fillApprovedCard();

    fireEvent.click(screen.getByLabelText(/Simular error del sistema/));
    fireEvent.click(screen.getByRole('button', { name: 'Pagar $100.00' }));

    await waitFor(() => expect(payMock).toHaveBeenCalledTimes(1));
    expect(payMock).toHaveBeenCalledWith(expect.any(Object), true);
    await waitFor(() =>
      expect(sweetAlertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          title: 'Error de sistema',
          text: 'Error de conexión con SnailPay.',
        }),
      ),
    );
    expect(authState.refreshUser).not.toHaveBeenCalled();
  });

  it('shows a toast and focuses the cardholder field when the titular is invalid', async () => {
    render(<RechargePage />);
    fillApprovedCard();
    fireEvent.change(screen.getByLabelText('Nombre del titular'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pagar $100.00' }));

    await waitFor(() =>
      expect(sweetAlertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          icon: 'warning',
          title: 'Ingresa un nombre de entre 2 y 80 caracteres.',
          showConfirmButton: false,
        }),
      ),
    );
    expect(screen.getByLabelText('Nombre del titular')).toHaveFocus();
    expect(
      screen.queryByText('Ingresa un nombre de entre 2 y 80 caracteres.'),
    ).toBeNull();
    expect(payMock).not.toHaveBeenCalled();
  });

  it('moves the focus to the first invalid field following the form order', async () => {
    render(<RechargePage />);
    fillApprovedCard();
    fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Pagar $100.00' }));

    await waitFor(() =>
      expect(sweetAlertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          title: 'El CVV debe contener exactamente 3 dígitos.',
        }),
      ),
    );
    expect(screen.getByLabelText('CVV')).toHaveFocus();
    expect(payMock).not.toHaveBeenCalled();
  });

  it('blocks the submission while a charge is being processed', async () => {
    let resolvePayment!: (value: unknown) => void;
    payMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePayment = resolve;
      }),
    );
    render(<RechargePage />);
    fillApprovedCard();

    const submitButton = screen.getByRole('button', { name: 'Pagar $100.00' });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cargando' })),
    );
    expect(screen.getByRole('button', { name: 'Cargando' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cargando' }));
    expect(payMock).toHaveBeenCalledTimes(1);

    resolvePayment({
      payment: { status: 'approved', card_number: '****1234', cvv: '***' },
      user: { balance: 100 },
    });
    await waitFor(() => expect(authState.refreshUser).toHaveBeenCalledTimes(1));
  });
});
