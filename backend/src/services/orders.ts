import type { OrderStatus, Prisma, User } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError, badRequest, notFound } from "../lib/http-error.js";
import { Money, money } from "../lib/money.js";
import { applySale } from "../pricing/market.js";

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

export interface OrderFilter {
  status?: OrderStatus;
  waiterId?: string;
  from?: Date;
  to?: Date;
}

/** Natakar dobi svoja naročila, upravitelj vsa (s filtrom po natakarju). Datum velja za čas ustvarjanja. */
export async function listOrders(user: User, filter: OrderFilter = {}) {
  const waiterId = user.role === "WAITER" ? user.id : filter.waiterId;
  const orders = await prisma.order.findMany({
    where: {
      ...(waiterId ? { waiterId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.from || filter.to ? { createdAt: { gte: filter.from, lt: filter.to } } : {}),
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return orders.map(toOrderDto);
}

/**
 * Zaključi ali prekliče odprto naročilo. Zaključeno naročilo mora imeti vsaj eno postavko.
 * Pogojna posodobitev (status = OPEN) prepreči dvojno spremembo pri hkratnih zahtevah.
 * Zaključek v isti transakciji takoj zviša cene prodanih pijač.
 */
export async function changeStatus(orderId: string, user: User, status: "COMPLETED" | "CANCELLED") {
  const order = await findAccessibleOrder(orderId, user);
  if (order.status !== "OPEN") throw new HttpError(409, "Naročilo ni več odprto");
  if (status === "COMPLETED" && order.items.length === 0) {
    throw badRequest("Naročilo brez postavk ni mogoče zaključiti");
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "OPEN" },
      data: { status, completedAt: status === "COMPLETED" ? now : null },
    });
    if (count === 0) throw new HttpError(409, "Naročilo ni več odprto");
    if (status === "COMPLETED") await applySale(tx, order.items, now);
  });
  return getOrder(orderId, user);
}
