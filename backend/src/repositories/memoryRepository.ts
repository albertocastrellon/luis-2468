import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { env, isTest } from "../config/env";
import type { Session, User } from "../types/domain";

export class DuplicateEmailError extends Error {
  constructor() {
    super("A user with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

class MemoryRepository {
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, Session>();

  constructor() {
    if (isTest) return;

    try {
      const users = JSON.parse(readFileSync(env.dataFile, "utf8")) as User[];
      for (const user of users) this.users.set(user.id, user);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  /** Crea un usuario únicamente cuando su correo normalizado todavía no existe. */
  createUser(input: Omit<User, "id">): User {
    if (this.findUserByEmail(input.email)) throw new DuplicateEmailError();

    const user: User = { id: `user_${randomUUID()}`, ...input };
    this.users.set(user.id, user);
    this.persistUsers();
    return user;
  }

  private persistUsers(): void {
    if (isTest) return;

    const directory = dirname(env.dataFile);
    const temporaryFile = `${env.dataFile}.tmp`;
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      temporaryFile,
      JSON.stringify([...this.users.values()], null, 2),
      "utf8",
    );
    renameSync(temporaryFile, env.dataFile);
  }

  /** Busca correos de forma consistente, ignorando espacios externos y mayúsculas. */
  findUserByEmail(email: string): User | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    return [...this.users.values()].find(
      (user) => user.email.trim().toLowerCase() === normalizedEmail,
    );
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  updateBalance(userId: string, amount: number): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.balance = Number((user.balance + amount).toFixed(2));
    this.persistUsers();
    return user;
  }

  createSession(userId: string): Session {
    const session: Session = {
      id: randomUUID(),
      userId,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  findSession(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt <= Date.now()) {
      if (session) this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  deleteSession(id: string): void {
    this.sessions.delete(id);
  }
}

export const memoryRepository = new MemoryRepository();
