import { randomUUID } from "node:crypto";
import { isDevelopment, isTest } from "../config/env";
import type { SnailPayRequest, SnailPayResponse, User } from "../types/domain";

export function processSnailPay(
  payment: SnailPayRequest,
  user: User,
  simulateError: boolean,
): SnailPayResponse {
  const now = new Date().toISOString();
  const base = {
    id: `sp_${randomUUID()}`,
    transaction_amount: payment.amount,
    date_created: now,
    payer_id: user.id,
    payer_email: user.email,
    reference: `REF_${Date.now()}`,
    // La respuesta solo contiene datos ficticios/enmascarados; el CVV real nunca se devuelve.
    card_number: `****${payment.cardNumber.slice(-4)}`,
    cvv: "***",
  };

  if ((isDevelopment || isTest) && simulateError) {
    return {
      ...base,
      status: "error",
      status_detail: "Error de conexión con SnailPay.",
      authorization_code: null,
    };
  }
  if (payment.cardNumber === "4000400040004000") {
    return {
      ...base,
      status: "rejected",
      status_detail: "Tarjeta rechazada.",
      authorization_code: null,
    };
  }
  if (
    payment.cardNumber === "1234123412341234" &&
    payment.expirationDate === "12/26" &&
    payment.cvv === "543"
  ) {
    return {
      ...base,
      status: "approved",
      status_detail: "Cobro exitoso.",
      authorization_code: `AUTH_${Date.now()}`,
    };
  }
  return {
    ...base,
    status: "rejected",
    status_detail: "Datos de tarjeta no válidos.",
    authorization_code: null,
  };
}
