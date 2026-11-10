import { execSync } from "node:child_process";

export default function setup() {
  // Testna baza dobi vse migracije pred zagonom testov
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
