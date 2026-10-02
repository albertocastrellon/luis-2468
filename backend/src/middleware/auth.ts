import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { memoryRepository } from '../repositories/memoryRepository';
import { HttpError } from './errorHandler';

export const requireAuth: RequestHandler = (req, res, next) => {
  const sessionId = req.cookies?.[env.sessionCookieName] as string | undefined;
  const session = sessionId ? memoryRepository.findSession(sessionId) : undefined;
  if (!session) {
    next(new HttpError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.'));
    return;
  }
  res.locals.userId = session.userId;
  next();
};
