export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  balance: number;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  balance: number;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SnailPayRequest {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  fullName: string;
  amount: number;
}

export type SnailPayStatus = 'approved' | 'rejected' | 'error';

export interface SnailPayResponse {
  id: string;
  status: SnailPayStatus;
  status_detail: string;
  transaction_amount: number;
  date_created: string;
  authorization_code: string | null;
  reference: string;
  payer_id: string;
  payer_email: string;
  card_number: string;
  cvv: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
