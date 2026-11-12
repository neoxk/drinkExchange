import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/lib/password.js";
import { TEST_PASSWORD, createUser, resetDb } from "./helpers.js";

const app = createApp();

describe("prijava in odjava", () => {
  beforeEach(resetDb);

  it("ob pravilnih podatkih ustvari sejo v varnem piškotku", async () => {
    const user = await createUser({ email: "ana@bar.si", name: "Ana" });

    const res = await request(app).post("/api/auth/login").send({ email: "ANA@bar.si ", password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, name: "Ana", role: "WAITER" });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.csrfToken).toEqual(expect.any(String));
    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/^dx\.sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("GET /me vrne prijavljenega uporabnika", async () => {
    const user = await createUser({ email: "ana@bar.si" });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "ana@bar.si", password: TEST_PASSWORD });

    const res = await agent.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("napačno geslo, neznana e-pošta in deaktiviran račun vrnejo enako napako", async () => {
    await createUser({ email: "ana@bar.si" });
    await createUser({ email: "neaktiven@bar.si", active: false });

    const responses = await Promise.all([
      request(app).post("/api/auth/login").send({ email: "ana@bar.si", password: "napacno" }),
      request(app).post("/api/auth/login").send({ email: "nihce@bar.si", password: TEST_PASSWORD }),
      request(app).post("/api/auth/login").send({ email: "neaktiven@bar.si", password: TEST_PASSWORD }),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Napačna e-pošta ali geslo");
      expect(res.headers["set-cookie"]).toBeUndefined();
    }
  });

  it("manjkajoči podatki vrnejo 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "ni-email" });
    expect(res.status).toBe(400);
  });

  it("po odjavi seja ni več veljavna", async () => {
    await createUser({ email: "ana@bar.si" });
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: "ana@bar.si", password: TEST_PASSWORD });
    const cookie = login.headers["set-cookie"][0].split(";")[0];

    expect((await agent.post("/api/auth/logout").set("X-CSRF-Token", login.body.csrfToken)).status).toBe(204);

    expect((await agent.get("/api/auth/me")).status).toBe(401);
    // Tudi star piškotek ne deluje več
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("brez seje GET /me vrne 401", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });
});

describe("hashiranje gesel", () => {
  it("shrani geslo kot Argon2id hash", async () => {
    await resetDb();
    const user = await createUser();
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(TEST_PASSWORD);
    expect(await hashPassword(TEST_PASSWORD)).not.toBe(stored.passwordHash);
  });
});
