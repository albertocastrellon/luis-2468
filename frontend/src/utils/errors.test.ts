import axios, { AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  EMAIL_EXISTS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  RegistrationError,
  VALIDATION_ERROR_MESSAGE,
  getApiError,
} from './errors';

function apiError(code?: string, status = 400) {
  return new axios.AxiosError('request failed', 'ERR_BAD_REQUEST', {
    headers: new AxiosHeaders(),
  }, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { error: { code, message: 'internal detail', passwordHash: 'secret' } },
  });
}

describe('getApiError', () => {
  it('maps frontend registration errors without exposing internal details', () => {
    expect(getApiError(new RegistrationError('EMAIL_EXISTS', 'internal'))).toBe(EMAIL_EXISTS_MESSAGE);
    expect(getApiError(new RegistrationError('INVALID_CREDENTIALS', 'internal'))).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it('maps known API error codes to public messages', () => {
    expect(getApiError(apiError('EMAIL_EXISTS'))).toBe(EMAIL_EXISTS_MESSAGE);
    expect(getApiError(apiError('INVALID_CREDENTIALS'))).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(getApiError(apiError('VALIDATION_ERROR'))).toBe(VALIDATION_ERROR_MESSAGE);
    expect(getApiError(apiError('INTERNAL_ERROR'))).toBe(GENERIC_ERROR_MESSAGE);
    expect(getApiError(apiError('EMAIL_EXISTS'))).not.toContain('secret');
  });

  it.each([
    [401, 'Tu sesión expiró. Inicia sesión de nuevo.'],
    [403, 'No tienes permisos para realizar esta acción.'],
    [404, 'No encontramos lo que buscabas.'],
    [409, EMAIL_EXISTS_MESSAGE],
    [429, 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'],
    [500, GENERIC_ERROR_MESSAGE],
    [502, GENERIC_ERROR_MESSAGE],
    [503, GENERIC_ERROR_MESSAGE],
  ])('maps HTTP status %s safely', (status, expected) => {
    expect(getApiError(apiError(undefined, status))).toBe(expected);
  });

  it('handles network and unknown errors with safe fallbacks', () => {
    const networkError = new axios.AxiosError('Network Error', 'ERR_NETWORK', {
      headers: new AxiosHeaders(),
    });
    expect(getApiError(networkError)).toBe(NETWORK_ERROR_MESSAGE);
    expect(getApiError(new Error('internal stack'), 'Mensaje de formulario')).toBe('Mensaje de formulario');
  });
});
