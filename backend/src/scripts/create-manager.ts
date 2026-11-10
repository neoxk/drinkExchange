import { parseArgs } from "node:util";
import { prisma } from "../db.js";
import { hashPassword } from "../lib/password.js";

// Začetni skript: ustvari prvega upravitelja (javne registracije ni).
// Uporaba: npm run create-manager -- --email ana@bar.si --name "Ana Novak" --password "dolgo-geslo"
const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
  },
});

async function main() {
  const { email, name, password } = values;
  if (!email || !name || !password) {
    console.error('Uporaba: npm run create-manager -- --email <e-pošta> --name "<ime>" --password <geslo>');
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("Geslo mora imeti vsaj 8 znakov.");
    process.exitCode = 1;
    return;
  }
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name,
      role: "MANAGER",
      passwordHash: await hashPassword(password),
    },
  });
  console.log(`Ustvarjen upravitelj ${user.name} <${user.email}>.`);
}

main()
  .catch((e) => {
    console.error(e.code === "P2002" ? "Uporabnik s to e-pošto že obstaja." : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
