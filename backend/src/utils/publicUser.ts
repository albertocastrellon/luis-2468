import type { PublicUser, User } from '../types/domain';

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    balance: user.balance,
  };
}
