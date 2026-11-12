import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { config } from "./config.js";

declare module "express-session" {
  interface SessionData {
    userId: string;
    csrfToken: string;
  }
}

const PgStore = connectPgSimple(session);

export const SESSION_COOKIE = "dx.sid";

export function createSessionMiddleware() {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store: new PgStore({ conString: config.databaseUrl, tableName: "session", createTableIfMissing: false }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: 12 * 60 * 60 * 1000,
    },
  });
}
