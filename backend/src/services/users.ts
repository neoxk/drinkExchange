import type { User } from "@prisma/client";

/** Uporabnik brez občutljivih polj. */
export const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt.toISOString(),
});
