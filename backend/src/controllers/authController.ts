import bcrypt from "bcrypt";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import {
  DuplicateEmailError,
  memoryRepository,
} from "../repositories/memoryRepository";
import { HttpError } from "../middleware/errorHandler";
import { toPublicUser } from "../utils/publicUser";
import type { LoginInput, RegisterInput } from "../types/domain";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.nodeEnv === "production",
  maxAge: 1000 * 60 * 60 * 24,
};

function setSession(res: Parameters<RequestHandler>[1], userId: string): void {
  const session = memoryRepository.createSession(userId);
  res.cookie(env.sessionCookieName, session.id, cookieOptions);
}

/** Registra una cuenta sin crear una sesión para obligar al login explícito. */
export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as RegisterInput;
    const email = input.email.trim().toLowerCase();
    if (memoryRepository.findUserByEmail(email))
      throw new HttpError(
        409,
        "EMAIL_EXISTS",
        "Este correo ya está registrado.",
      );

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = memoryRepository.createUser({
      fullName: input.fullName.trim(),
      email,
      passwordHash,
      balance: 0,
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      next(
        new HttpError(
          409,
          "EMAIL_EXISTS",
          "Este correo ya está registrado.",
        ),
      );
      return;
    }
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as LoginInput;
    const user = memoryRepository.findUserByEmail(
      input.email.trim().toLowerCase(),
    );
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "Correo o contraseña incorrectos.",
      );
    setSession(res, user.id);
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = (req, res) => {
  const user = memoryRepository.findUserById(res.locals.userId as string);
  if (!user)
    throw new HttpError(401, "UNAUTHENTICATED", "La sesión ya no es válida.");
  res.json({ user: toPublicUser(user) });
};

export const logout: RequestHandler = (req, res) => {
  const sessionId = req.cookies?.[env.sessionCookieName] as string | undefined;
  if (sessionId) memoryRepository.deleteSession(sessionId);
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
  });
  res.status(204).send();
};
