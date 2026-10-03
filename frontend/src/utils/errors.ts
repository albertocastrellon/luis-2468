// src/utils/errors.ts
import axios, { type AxiosError } from "axios";

// ─────────────────────────────────────────────
// Mensajes públicos (los que ve el usuario)
// ─────────────────────────────────────────────
export const EMAIL_EXISTS_MESSAGE = "Este correo ya está registrado.";
export const INVALID_CREDENTIALS_MESSAGE = "Correo o contraseña incorrectos.";
export const GENERIC_ERROR_MESSAGE = "Ocurrió un error. Inténtalo de nuevo.";
export const NETWORK_ERROR_MESSAGE =
  "Revisa tu conexión o ponte en contacto con soporte.";
export const VALIDATION_ERROR_MESSAGE = "Revisa los datos ingresados.";

// ─────────────────────────────────────────────
// Códigos de error que puede devolver el backend
// ─────────────────────────────────────────────
export type ApiErrorCode =
  | "EMAIL_EXISTS"
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

// Mapa: código del backend → mensaje público seguro
const ERROR_CODE_MESSAGES: Record<ApiErrorCode, string> = {
  EMAIL_EXISTS: EMAIL_EXISTS_MESSAGE,
  INVALID_CREDENTIALS: INVALID_CREDENTIALS_MESSAGE,
  VALIDATION_ERROR: VALIDATION_ERROR_MESSAGE,
  UNAUTHORIZED: "Tu sesión expiró. Inicia sesión de nuevo.",
  FORBIDDEN: "No tienes permisos para realizar esta acción.",
  NOT_FOUND: "No encontramos lo que buscabas.",
  RATE_LIMITED: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  INTERNAL_ERROR: GENERIC_ERROR_MESSAGE,
};

// ─────────────────────────────────────────────
// Error propio para casos detectados en el frontend
// ─────────────────────────────────────────────
export class RegistrationError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    // El mensaje interno NUNCA se muestra al usuario; es solo para logs.
    super(message ?? code);
    this.name = "RegistrationError";
    this.code = code;
  }
}

// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────
function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && value in ERROR_CODE_MESSAGES;
}

function isAxiosErrorWithData(
  error: unknown,
): error is AxiosError<{ error?: { code?: string } }> {
  return axios.isAxiosError(error) && !!error.response?.data;
}

// ─────────────────────────────────────────────
// Función principal: devuelve SIEMPRE un mensaje seguro
// ─────────────────────────────────────────────
export function getApiError(
  error: unknown,
  fallback = GENERIC_ERROR_MESSAGE,
): string {
  // 1. Errores propios del frontend (ej. email duplicado detectado antes de llamar al backend)
  if (error instanceof RegistrationError) {
    return ERROR_CODE_MESSAGES[error.code] ?? GENERIC_ERROR_MESSAGE;
  }

  // 2. Errores de Axios con respuesta del backend
  if (isAxiosErrorWithData(error)) {
    const code = error.response?.data?.error?.code;

    if (isApiErrorCode(code)) {
      return ERROR_CODE_MESSAGES[code];
    }

    // Fallback por status HTTP si el backend no mandó un code conocido
    const status = error.response?.status;
    switch (status) {
      case 401:
        return ERROR_CODE_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_CODE_MESSAGES.FORBIDDEN;
      case 404:
        return ERROR_CODE_MESSAGES.NOT_FOUND;
      case 409:
        return EMAIL_EXISTS_MESSAGE; // por defecto en registro
      case 429:
        return ERROR_CODE_MESSAGES.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
        return GENERIC_ERROR_MESSAGE;
    }
  }

  // 3. Errores de red (sin respuesta del servidor)
  if (axios.isAxiosError(error) && !error.response) {
    return NETWORK_ERROR_MESSAGE;
  }

  // 4. Cualquier otra cosa → fallback seguro específico del formulario.
  return fallback;
}
