import type { RequestHandler } from "express";
import { memoryRepository } from "../repositories/memoryRepository";
import { HttpError } from "../middleware/errorHandler";
import { processSnailPay } from "../services/snailPayService";
import type { SnailPayRequest } from "../types/domain";
import { toPublicUser } from "../utils/publicUser";

export const pay: RequestHandler = (req, res) => {
  const user = memoryRepository.findUserById(res.locals.userId as string);
  if (!user)
    throw new HttpError(401, "UNAUTHENTICATED", "La sesión ya no es válida.");
  const payment = req.body as SnailPayRequest;
  const simulateError =
    req.header("X-SnailPay-Error") === "true" ||
    req.query.simulate_error === "true";
  const result = processSnailPay(payment, user, simulateError);
  if (result.status === "approved")
    memoryRepository.updateBalance(user.id, result.transaction_amount);
  const updatedUser = memoryRepository.findUserById(user.id) ?? user;
  res
    .status(
      result.status === "approved"
        ? 200
        : result.status === "rejected"
          ? 402
          : 502,
    )
    .json({ payment: result, user: toPublicUser(updatedUser) });
};
