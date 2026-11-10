import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createDrink, createUser, loginAs, resetDb } from "./helpers.js";

const app = createApp();

async function waiterSession() {
  const waiter = await createUser({ role: "WAITER" });
  const { agent, csrf } = await loginAs(app, waiter);
  const post = (url: string, body: object = {}) => agent.post(url).set("X-CSRF-Token", csrf).send(body);
  return { waiter, agent, post };
}

describe("ustvarjanje naročila", () => {
  beforeEach(resetDb);

  it("natakar ustvari odprto naročilo", async () => {
    const { waiter, post } = await waiterSession();

    const res = await post("/api/orders");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "OPEN", waiter: { id: waiter.id }, items: [], total: "0.00" });
  });

  it("gost ne more ustvariti naročila", async () => {
    expect((await request(app).post("/api/orders")).status).toBe(401);
  });
});

describe("dodajanje postavk", () => {
  beforeEach(resetDb);

  it("zaklene trenutno ceno pijače na postavki in izračuna skupni znesek", async () => {
    const drink = await createDrink({ name: "Pivo", basePrice: 3, currentPrice: 3.15 });
    const { post } = await waiterSession();
    const order = (await post("/api/orders")).body;

    const res = await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.items).toEqual([
      expect.objectContaining({ drinkName: "Pivo", quantity: 2, unitPrice: "3.15", total: "6.30" }),
    ]);
    expect(res.body.total).toBe("6.30");
  });

  it("ignorira ceno, ki jo pošlje odjemalec", async () => {
    const drink = await createDrink({ currentPrice: 4 });
    const { post } = await waiterSession();
    const order = (await post("/api/orders")).body;

    const res = await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 1, unitPrice: "0.01" });

    expect(res.body.items[0].unitPrice).toBe("4.00");
  });

  it("kasnejša sprememba tečaja ne vpliva na že dodano postavko", async () => {
    const drink = await createDrink({ currentPrice: 3 });
    const { agent, post } = await waiterSession();
    const order = (await post("/api/orders")).body;
    await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 1 });

    await prisma.drink.update({ where: { id: drink.id }, data: { currentPrice: 3.5 } });
    await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 1 });

    const res = await agent.get(`/api/orders/${order.id}`);
    expect(res.body.items.map((i: { unitPrice: string }) => i.unitPrice)).toEqual(["3.00", "3.50"]);
    expect(res.body.total).toBe("6.50");
  });

  it.each([0, -1, 1.5, "2"])("zavrne neveljavno količino %s", async (quantity) => {
    const drink = await createDrink();
    const { post } = await waiterSession();
    const order = (await post("/api/orders")).body;

    expect((await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity })).status).toBe(400);
  });

  it("ne doda neaktivne pijače", async () => {
    const drink = await createDrink({ active: false });
    const { post } = await waiterSession();
    const order = (await post("/api/orders")).body;

    const res = await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Pijača ni na voljo");
  });

  it("natakar ne more dodajati v tuje naročilo", async () => {
    const drink = await createDrink();
    const first = await waiterSession();
    const second = await waiterSession();
    const order = (await first.post("/api/orders")).body;

    expect((await second.post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 1 })).status).toBe(404);
    expect((await second.agent.get(`/api/orders/${order.id}`)).status).toBe(404);
  });

  it("ne doda postavke v naročilo, ki ni odprto", async () => {
    const drink = await createDrink();
    const { post } = await waiterSession();
    const order = (await post("/api/orders")).body;
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });

    expect((await post(`/api/orders/${order.id}/items`, { drinkId: drink.id, quantity: 1 })).status).toBe(409);
  });
});
