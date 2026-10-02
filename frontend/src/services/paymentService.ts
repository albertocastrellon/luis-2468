import { api } from "./api";
import type { PaymentForm, PaymentResponse } from "../types";

export const paymentService = {
  pay: async (payload: PaymentForm, simulateError = false) =>
    (
      await api.post<PaymentResponse>(
        `/snailpay/pay${simulateError ? "?simulate_error=true" : ""}`,
        payload,
      )
    ).data,
};
