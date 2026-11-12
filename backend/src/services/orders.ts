import type { Prisma, User } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError, badRequest, notFound } from "../lib/http-error.js";
import { Money, money } from "../lib/money.js";

const orderInclude = {
  waiter: { select: { id: true, name: true } },
  items: { include: { drink: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderDto(order: OrderWithItems) {
  const items = order.items.map((item) => ({
    id: item.id,
    drinkId: item.drinkId,
    drinkName: item.drink.name,
    quantity: item.quantity,
    unitPrice: money(item.unitPrice),
    total: money(new Money(item.unitPrice).mul(item.quantity)),
  }));
  const total = order.items.reduce((sum, i) => sum.plus(new Money(i.unitPrice).mul(i.quantity)), new Money(0));
  return {
    id: order.id,
    status: order.status,
    waiter: order.waiter,
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
    items,
    total: money(total),
  };
}

/** Naročilo, ki ga sme uporabnik videti; natakar samo svoja (tuja so zanj 404). */
async function findAccessibleOrder(id: string, user: User) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order || (user.role === "WAITER" && order.waiterId !== user.id)) {
    throw notFound("Naročilo ne obstaja");
  }
  return order;
}

export async function getOrder(id: string, user: User) {
  return toOrderDto(await findAccessibleOrder(id, user));
}

export async function createOrder(user: User) {
  const order = await prisma.order.create({ data: { waiterId: user.id }, include: orderInclude });
  return toOrderDto(order);
}

/** Doda postavko po trenutni ceni pijače; cena se zaklene na postavki. */
export async function addItem(orderId: string, user: User, input: { drinkId: string; quantity: number }) {
  const order = await findAccessibleOrder(orderId, user);
  if (order.status !== "OPEN") throw new HttpError(409, "Naročilo ni več odprto");

  const drink = await prisma.drink.findUnique({ where: { id: input.drinkId } });
  if (!drink || !drink.active) throw badRequest("Pijača ni na voljo");

  await prisma.orderItem.create({
    data: { orderId, drinkId: drink.id, quantity: input.quantity, unitPrice: drink.currentPrice },
  });
  return getOrder(orderId, user);
}
