export interface User {
  id: string;
  fullName: string;
  email: string;
  balance: number;
}

export interface AuthResponse {
  user: User;
}

export interface PaymentForm {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  fullName: string;
  amount: number;
}

export interface PaymentResponse {
  payment: {
    id: string;
    status: 'approved' | 'rejected' | 'error';
    status_detail: string;
    transaction_amount: number;
    authorization_code: string | null;
    reference: string;
    card_number: string;
    cvv: string;
  };
  user: User;
}

export interface ApiError {
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface SnailStat {
  name: string;
  wins: number;
}
