import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createDrink, createUser, loginAs, resetDb } from "./helpers.js";

const app = createApp();

async function session(role: "WAITER" | "MANAGER" = "WAITER") {
  const user = await createUser({ role });
  const { agent, csrf } = await loginAs(app, user);
  return {
    user,
    agent,
    post: (url: string, body: object = {}) => agent.post(url).set("X-CSRF-Token", csrf).send(body),
    patch: (url: string, body: object) => agent.patch(url).set("X-CSRF-Token", csrf).send(body),
  };
}

async function orderWithItem(s: Awaited<ReturnType<typeof session>>) {
  const drink = await createDrink();
  const order = (await s.post("/api/orders")).body;
  await s.post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 2 });
  return order.id as string;
}

describe("PATCH /api/orders/:id/status", () => {
  beforeEach(resetDb);

  it("zaključi odprto naročilo in zapiše čas zaključka", async () => {
    const s = await session();
    const id = await orderWithItem(s);

    const res = await s.patch(`/api/orders/${id}/status`, { status: "COMPLETED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("COMPLETED");
    expect(res.body.completedAt).toEqual(expect.any(String));
  });

  it("prekliče odprto naročilo brez časa zaključka", async () => {
    const s = await session();
    const id = await orderWithItem(s);

    const res = await s.patch(`/api/orders/${id}/status`, { status: "CANCELLED" });

    expect(res.body).toMatchObject({ status: "CANCELLED", completedAt: null });
  });

  it("naročila brez postavk ni mogoče zaključiti, lahko pa ga prekličemo", async () => {
    const s = await session();
    const order = (await s.post("/api/orders")).body;

    expect((await s.patch(`/api/orders/${order.id}/status`, { status: "COMPLETED" })).status).toBe(400);
    expect((await s.patch(`/api/orders/${order.id}/status`, { status: "CANCELLED" })).status).toBe(200);
  });

  it.each([
    ["COMPLETED", "CANCELLED"],
    ["CANCELLED", "COMPLETED"],
    ["COMPLETED", "COMPLETED"],
  ])("iz stanja %s ni prehoda v %s", async (first, second) => {
    const s = await session();
    const id = await orderWithItem(s);
    await s.patch(`/api/orders/${id}/status`, { status: first });

    expect((await s.patch(`/api/orders/${id}/status`, { status: second })).status).toBe(409);
  });

  it("zaključenega naročila ni več mogoče spreminjati", async () => {
    const s = await session();
    const id = await orderWithItem(s);
    await s.patch(`/api/orders/${id}/status`, { status: "COMPLETED" });
    const drink = await createDrink();

    expect((await s.post(`/api/orders/${id}/items`, { drinkId: drink.id, quantity: 1 })).status).toBe(409);
  });

  it("zavrne neveljaven status", async () => {
    const s = await session();
    const id = await orderWithItem(s);
    expect((await s.patch(`/api/orders/${id}/status`, { status: "OPEN" })).status).toBe(400);
  });

  it("natakar ne more spreminjati tujega naročila, upravitelj lahko", async () => {
    const owner = await session();
    const other = await session();
    const manager = await session("MANAGER");
    const id = await orderWithItem(owner);

    expect((await other.patch(`/api/orders/${id}/status`, { status: "CANCELLED" })).status).toBe(404);
    expect((await manager.patch(`/api/orders/${id}/status`, { status: "CANCELLED" })).status).toBe(200);
  });
});

describe("GET /api/orders", () => {
  beforeEach(resetDb);

  it("natakar vidi samo svoja naročila, upravitelj vsa", async () => {
    const a = await session();
    const b = await session();
    const manager = await session("MANAGER");
    await orderWithItem(a);
    await orderWithItem(b);

    const own = (await a.agent.get("/api/orders")).body;
    expect(own).toHaveLength(1);
    expect(own[0].waiter.id).toBe(a.user.id);
    expect((await manager.agent.get("/api/orders")).body).toHaveLength(2);
  });

  it("filtrira po statusu", async () => {
    const s = await session();
    const id = await orderWithItem(s);
    await orderWithItem(s);
    await s.patch(`/api/orders/${id}/status`, { status: "COMPLETED" });

    const open = (await s.agent.get("/api/orders?status=OPEN")).body;
    expect(open).toHaveLength(1);
    expect(open[0].status).toBe("OPEN");
    expect(await prisma.order.count()).toBe(2);
  });
});
