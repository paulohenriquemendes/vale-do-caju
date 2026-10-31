import { hash, argon2id } from "argon2";
import { randomUUID } from "node:crypto";
import { query, migrate, close } from "./db";
if (process.env.NODE_ENV === "production")
  throw Error("Conta demonstrativa proibida em produção.");
if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12)
  throw Error("Defina DEMO_PASSWORD com pelo menos 12 caracteres no .env.");
await migrate();
await query(
  "INSERT INTO users(id,email,nickname,password) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password",
  [
    randomUUID(),
    "demo@valedocaju.test",
    "Agricultor Demo",
    await hash(process.env.DEMO_PASSWORD, { type: argon2id }),
  ],
);
await close();
console.log("Conta demonstrativa preparada.");
