import { Prisma, type Role, type User } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError, badRequest, notFound } from "../lib/http-error.js";
import { hashPassword } from "../lib/password.js";

/** Uporabnik brez občutljivih polj. */
export const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt.toISOString(),
});

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return users.map(toPublicUser);
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) },
    });
    return toPublicUser(user);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Uporabnik s to e-pošto že obstaja");
    }
    throw e;
  }
}

/** Odstrani vse strežniške seje uporabnika (npr. ob deaktivaciji). */
const destroySessions = (userId: string) =>
  prisma.$executeRaw`DELETE FROM "session" WHERE sess->>'userId' = ${userId}`;

export async function updateUser(
  id: string,
  actor: User,
  patch: { name?: string; role?: Role; active?: boolean; password?: string },
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("Uporabnik ne obstaja");
  if (id === actor.id && (patch.active === false || (patch.role && patch.role !== "MANAGER"))) {
    throw badRequest("Svojega računa ne morete deaktivirati ali mu odvzeti vloge upravitelja");
  }
  const { password, ...rest } = patch;
  const updated = await prisma.user.update({
    where: { id },
    data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
  });
  if (patch.active === false || (password && id !== actor.id)) await destroySessions(id);
  return toPublicUser(updated);
}
