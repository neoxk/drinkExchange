import { Algorithm, hash, verify } from "@node-rs/argon2";

const options = { algorithm: Algorithm.Argon2id };

export const hashPassword = (password: string) => hash(password, options);

export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password, options).catch(() => false);
