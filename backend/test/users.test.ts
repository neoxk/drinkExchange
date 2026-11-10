import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createDrink, createUser, loginAs, resetDb } from "./helpers.js";

const app = createApp();

async function session(role: "WAITER" | "MANAGER" = "MANAGER") {
  const user = await createUser({ role });
  const { agent, csrf } = await loginAs(app, user);
  return {
    user,
    agent,
    post: (url: string, body: object = {}) => agent.post(url).set("X-CSRF-Token", csrf).send(body),
    patch: (url: string, body: object) => agent.patch(url).set("X-CSRF-Token", csrf).send(body),
    del: (url: string) => agent.delete(url).set("X-CSRF-Token", csrf),
  };
}

describe("upravljanje uporabnikov", () => {
  beforeEach(resetDb);

  it("upravitelj ustvari natakarja, ki se lahko prijavi", async () => {
    const m = await session();

    const res = await m.post("/api/users", { name: "Miha", email: "Miha@Bar.si", password: "skrivnost1" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Miha", email: "miha@bar.si", role: "WAITER", active: true });
    expect(res.body).not.toHaveProperty("passwordHash");
    const login = await request(app).post("/api/auth/login").send({ email: "miha@bar.si", password: "skrivnost1" });
    expect(login.status).toBe(200);
  });

  it("e-pošta mora biti enolična", async () => {
    const m = await session();
    await m.post("/api/users", { name: "A", email: "a@bar.si", password: "skrivnost1" });

    const res = await m.post("/api/users", { name: "B", email: "A@bar.si", password: "skrivnost2" });

    expect(res.status).toBe(409);
  });

  it.each([
    [{ name: "A", email: "ni-email", password: "skrivnost1" }, "email"],
    [{ name: "A", email: "a@bar.si", password: "kratko" }, "password"],
    [{ name: "A", email: "a@bar.si", password: "skrivnost1", role: "ADMIN" }, "role"],
  ])("zavrne neveljavne podatke %o", async (body, field) => {
    const m = await session();
    const res = await m.post("/api/users", body);
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it("deaktiviran uporabnik se ne more prijaviti, njegova seja preneha veljati", async () => {
    const m = await session();
    const w = await session("WAITER");

    const res = await m.patch(`/api/users/${w.user.id}`, { active: false });

    expect(res.body.active).toBe(false);
    expect((await w.agent.get("/api/auth/me")).status).toBe(401);
    expect(await prisma.$queryRaw<unknown[]>`SELECT 1 FROM "session" WHERE sess->>'userId' = ${w.user.id}`).toHaveLength(0);
    const login = await request(app).post("/api/auth/login").send({ email: w.user.email, password: "geslo-1234" });
    expect(login.status).toBe(401);
  });

  it("upravitelj ne more deaktivirati sebe", async () => {
    const m = await session();
    expect((await m.patch(`/api/users/${m.user.id}`, { active: false })).status).toBe(400);
  });

  it("seznam uporabnikov ne vsebuje gesel", async () => {
    const m = await session();
    await session("WAITER");
    const res = await m.agent.get("/api/users");
    expect(res.body).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain("argon2");
  });

  it("natakar ne more upravljati uporabnikov", async () => {
    const w = await session("WAITER");
    expect((await w.agent.get("/api/users")).status).toBe(403);
    expect((await w.post("/api/users", { name: "X", email: "x@bar.si", password: "skrivnost1" })).status).toBe(403);
  });
});

describe("pregled naročil za upravitelja", () => {
  beforeEach(resetDb);

  async function order(waiterId: string, status: "OPEN" | "COMPLETED" | "CANCELLED", createdAt: string) {
    const drink = await createDrink();
    await prisma.order.create({
      data: {
        waiterId,
        status,
        createdAt: new Date(createdAt),
        completedAt: status === "COMPLETED" ? new Date(createdAt) : null,
        items: { create: { drinkId: drink.id, quantity: 1, unitPrice: 3 } },
      },
    });
  }

  it("filtrira po statusu, natakarju in datumu", async () => {
    const m = await session();
    const a = await createUser();
    const b = await createUser();
    await order(a.id, "COMPLETED", "2026-11-10T12:00:00Z");
    await order(a.id, "CANCELLED", "2026-11-11T12:00:00Z");
    await order(b.id, "COMPLETED", "2026-11-11T13:00:00Z");

    const get = async (q: string) => (await m.agent.get(`/api/orders?${q}`)).body as { waiter: { id: string } }[];

    expect(await get("")).toHaveLength(3);
    expect(await get("status=COMPLETED")).toHaveLength(2);
    expect((await get(`waiterId=${a.id}`)).every((o) => o.waiter.id === a.id)).toBe(true);
    expect(await get(`waiterId=${a.id}`)).toHaveLength(2);
    expect(await get("from=2026-11-11T00:00:00Z&to=2026-11-12T00:00:00Z")).toHaveLength(2);
    expect(await get(`status=COMPLETED&waiterId=${b.id}&from=2026-11-11T00:00:00Z`)).toHaveLength(1);
  });

  it("natakar s filtrom po drugem natakarju še vedno vidi samo svoja naročila", async () => {
    const w = await session("WAITER");
    const other = await createUser();
    await order(other.id, "OPEN", "2026-11-11T12:00:00Z");

    expect((await w.agent.get(`/api/orders?waiterId=${other.id}`)).body).toHaveLength(0);
  });

  it("zgodovine cen in zaklenjenih cen ni mogoče brisati ali spreminjati prek API", async () => {
    const m = await session();
    const drink = await createDrink();
    await order(m.user.id, "COMPLETED", "2026-11-11T12:00:00Z");
    const item = await prisma.orderItem.findFirstOrThrow();

    expect((await m.del(`/api/drinks/${drink.id}/history`)).status).toBe(404);
    expect((await m.patch(`/api/orders/${item.orderId}/items/${item.id}`, { unitPrice: 1 })).status).toBe(404);
    expect((await prisma.orderItem.findFirstOrThrow()).unitPrice.toFixed(2)).toBe("3.00");
  });
});
