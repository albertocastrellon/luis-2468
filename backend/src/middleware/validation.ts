import type { RequestHandler } from 'express';
import { HttpError } from './errorHandler';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cardPattern = /^\d{16}$/;
const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;

function isExpired(expirationDate: string): boolean {
  const [monthText, yearText] = expirationDate.split('/');
  const expirationMonth = Number(monthText);
  const expirationYear = 2000 + Number(yearText);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  return expirationYear < currentYear || (expirationYear === currentYear && expirationMonth < currentMonth);
}

export const validateRegister: RequestHandler = (req, _res, next) => {
  const { fullName, email, password } = req.body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 80) fields.fullName = 'Ingresa un nombre válido.';
  if (typeof email !== 'string' || !emailPattern.test(email.trim())) fields.email = 'Ingresa un correo válido.';
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) fields.password = 'La contraseña debe tener entre 8 y 72 caracteres.';
  if (Object.keys(fields).length) {
    next(new HttpError(400, 'VALIDATION_ERROR', 'Revisa los datos ingresados.', fields));
    return;
  }
  next();
};

export const validateLogin: RequestHandler = (req, _res, next) => {
  const { email, password } = req.body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string' || !emailPattern.test(email.trim()) || !password) {
    next(new HttpError(400, 'VALIDATION_ERROR', 'Correo o contraseña inválidos.'));
    return;
  }
  next();
};

export const validatePayment: RequestHandler = (req, _res, next) => {
  const { cardNumber, expirationDate, cvv, fullName, amount } = req.body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  if (typeof cardNumber !== 'string' || !cardPattern.test(cardNumber)) fields.cardNumber = 'La tarjeta debe tener 16 dígitos.';
  if (typeof expirationDate !== 'string' || !expiryPattern.test(expirationDate)) {
    fields.expirationDate = 'Usa el formato MM/AA con un mes entre 01 y 12.';
  } else if (isExpired(expirationDate)) {
    fields.expirationDate = 'La tarjeta está vencida. Ingresa una fecha vigente.';
  }
  // El CVV del mock debe ser una cadena de exactamente tres dígitos.
  if (typeof cvv !== 'string' || !/^\d{3}$/.test(cvv)) fields.cvv = 'El CVV debe tener exactamente 3 dígitos.';
  if (typeof fullName !== 'string' || fullName.trim().length < 2) fields.fullName = 'Ingresa el nombre del titular.';
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 100000) fields.amount = 'El monto debe ser mayor que 0.';
  if (Object.keys(fields).length) {
    next(new HttpError(400, 'VALIDATION_ERROR', 'Revisa los datos de pago.', fields));
    return;
  }
  next();
};
