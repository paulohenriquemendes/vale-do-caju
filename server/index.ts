import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import serve from "@fastify/static";
import { hash, verify, argon2id } from "argon2";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { z } from "zod";
import { query, migrate, close } from "./db";
import { initial, act, restore, type State } from "../shared/game";
const prod = process.env.NODE_ENV === "production",
  origin = process.env.APP_ORIGIN || "http://localhost:5173";
if (prod && !origin.startsWith("https://"))
  throw Error("HTTPS obrigatório em produção.");
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const app = Fastify({ logger: true, bodyLimit: 16384 });
await app.register(cookie);
await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
await migrate();
app.addHook("onRequest", async (req, reply) => {
  reply
    .header("X-Content-Type-Options", "nosniff")
    .header("Referrer-Policy", "same-origin");
  if (req.url.startsWith("/api")) reply.header("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== origin &&
    !(!prod && req.headers.origin === `http://${req.headers.host}`)
  )
    return reply.code(403).send({ error: "Origem não autorizada." });
});
app.setErrorHandler((err: any, req, reply) => {
  const status = err instanceof z.ZodError ? 400 : err.statusCode || 400;
  reply.code(status).send({
    error:
      err instanceof z.ZodError
        ? "Confira os campos informados."
        : status === 500
          ? "Não foi possível concluir. Tente novamente."
          : err.message,
  });
});
async function user(req: any) {
  const token = req.cookies.session;
  if (!token)
    throw Object.assign(Error("Entre na sua conta."), { statusCode: 401 });
  const r = await query(
    "SELECT users.id,users.nickname FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=$1 AND expires>$2",
    [digest(token), Date.now()],
  );
  if (!r.rows[0])
    throw Object.assign(Error("Sua sessão expirou."), { statusCode: 401 });
  return r.rows[0];
}
async function session(reply: any, id: string) {
  const token = randomBytes(32).toString("hex");
  await query("INSERT INTO sessions VALUES($1,$2,$3)", [
    digest(token),
    id,
    Date.now() + 7 * 86400000,
  ]);
  reply.setCookie("session", token, {
    httpOnly: true,
    secure: prod,
    sameSite: "strict",
    path: "/",
    maxAge: 604800,
  });
}
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(12).max(128),
});
app.post(
  "/api/register",
  { config: { rateLimit: { max: 6, timeWindow: "1 hour" } } },
  async (req, reply) => {
    const b = credentials
      .extend({ nickname: z.string().trim().min(2).max(30) })
      .parse(req.body);
    const id = randomUUID();
    try {
      await query("INSERT INTO users VALUES($1,$2,$3,$4)", [
        id,
        b.email,
        b.nickname,
        await hash(b.password, { type: argon2id }),
      ]);
    } catch (e: any) {
      if (e.code === "23505") throw Error("Este e-mail já está cadastrado.");
      throw e;
    }
    await session(reply, id);
    return { id, nickname: b.nickname };
  },
);
app.post(
  "/api/login",
  { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
  async (req, reply) => {
    const b = credentials.parse(req.body),
      r = await query("SELECT * FROM users WHERE email=$1", [b.email]);
    if (!r.rows[0] || !(await verify(r.rows[0].password, b.password)))
      throw Error("E-mail ou senha incorretos.");
    await session(reply, r.rows[0].id);
    return { id: r.rows[0].id, nickname: r.rows[0].nickname };
  },
);
app.get("/api/me", async (req) => user(req));
app.post("/api/logout", async (req, reply) => {
  const current = await user(req);
  await query("DELETE FROM presence WHERE user_id=$1", [current.id]);
  await query("DELETE FROM sessions WHERE token=$1", [
    digest(req.cookies.session || ""),
  ]);
  reply.clearCookie("session", { path: "/" });
  return { ok: true };
});
app.post(
  "/api/forgot",
  { config: { rateLimit: { max: 3, timeWindow: "15 minutes" } } },
  async (req) => {
    const { email } = z.object({ email: z.email() }).parse(req.body);
    if (!process.env.RESET_WEBHOOK_URL)
      throw Error("Envio de recuperação ainda não configurado neste ambiente.");
    const r = await query("SELECT id FROM users WHERE email=$1", [
      email.toLowerCase(),
    ]);
    if (r.rows[0]) {
      const token = randomBytes(32).toString("hex");
      await query("INSERT INTO resets VALUES($1,$2,$3)", [
        digest(token),
        r.rows[0].id,
        Date.now() + 1800000,
      ]);
      const response = await fetch(process.env.RESET_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESET_WEBHOOK_TOKEN || ""}`,
        },
        body: JSON.stringify({ email, url: `${origin}/?reset=${token}` }),
      });
      if (!response.ok) throw Error("Serviço de e-mail indisponível.");
    }
    return { ok: true };
  },
);
app.post(
  "/api/reset",
  { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
  async (req) => {
    const b = z
      .object({
        token: z.string().length(64),
        password: z.string().min(12).max(128),
      })
      .parse(req.body);
    const r = await query(
      "DELETE FROM resets WHERE token=$1 AND expires>$2 RETURNING user_id",
      [digest(b.token), Date.now()],
    );
    if (!r.rows[0]) throw Error("Link inválido ou expirado.");
    await query("UPDATE users SET password=$1 WHERE id=$2", [
      await hash(b.password, { type: argon2id }),
      r.rows[0].user_id,
    ]);
    await query("DELETE FROM sessions WHERE user_id=$1", [r.rows[0].user_id]);
    return { ok: true };
  },
);
app.get("/api/save", async (req) => {
  const u = await user(req);
  const s = (await query("SELECT state FROM saves WHERE user_id=$1", [u.id]))
    .rows[0]?.state;
  return s ? restore(s) : null;
});
// Serialize mutations per account; optimistic SQL version checks protect multiple server processes.
const locks = new Map<string, Promise<unknown>>();
async function locked<T>(id: string, fn: () => Promise<T>) {
  const previous = locks.get(id) || Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  locks.set(id, next);
  try {
    return await next;
  } finally {
    if (locks.get(id) === next) locks.delete(id);
  }
}
app.post("/api/new", async (req) => {
  const u = await user(req);
  const b = z
    .object({
      name: z.string().trim().min(2).max(30),
      skin: z.enum(["terracota", "azul", "verde"]),
      mode: z.enum(["historia", "sobrevivencia"]),
    })
    .parse(req.body);
  return locked(u.id, async () => {
    const s = initial(b.name, b.skin, b.mode);
    await query(
      "INSERT INTO saves VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state",
      [u.id, JSON.stringify(s)],
    );
    await query("DELETE FROM commands WHERE user_id=$1", [u.id]);
    return s;
  });
});
const command = z.object({
  id: z.uuid(),
  version: z.number().int().nonnegative(),
  action: z.object({
    kind: z.string().max(20),
    target: z.number().int().optional(),
    item: z
      .enum([
        "caju",
        "castanha",
        "semente",
        "feijao",
        "alimento",
        "muda",
        "ovo",
        "racao",
      ])
      .optional(),
    quantity: z.number().int().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
  }),
});
app.post("/api/action", async (req) => {
  const u = await user(req),
    b = command.parse(req.body);
  return locked(u.id, async () => {
    const s = (await query("SELECT state FROM saves WHERE user_id=$1", [u.id]))
      .rows[0]?.state as State;
    if (!s) throw Error("Comece uma partida.");
    if (
      (
        await query("SELECT id FROM commands WHERE user_id=$1 AND id=$2", [
          u.id,
          b.id,
        ])
      ).rows.length
    )
      return s;
    if (s.version !== b.version)
      throw Object.assign(
        Error("Partida atualizada em outra sessão. Recarregue para continuar."),
        { statusCode: 409 },
      );
    const next = act(s, b.action);
    const result = await query(
      `WITH updated AS (UPDATE saves SET state=$1 WHERE user_id=$2 AND (state->>'version')::integer=$3 RETURNING user_id), contribution AS (UPDATE family_world SET treasury=treasury+$5 WHERE id=1 AND EXISTS(SELECT 1 FROM updated)) INSERT INTO commands(user_id,id) SELECT user_id,$4 FROM updated RETURNING id`,
      [
        JSON.stringify(next),
        u.id,
        s.version,
        b.id,
        (next.contributed || 0) - (s.contributed || 0),
      ],
    );
    if (!result.rows.length)
      throw Object.assign(
        Error("Conflito de salvamento. Recarregue a partida."),
        { statusCode: 409 },
      );
    return next;
  });
});
// The family is shared; inventories and harvest timers remain individual.
const presenceInput = z.object({
  x: z.number().min(40).max(1240),
  y: z.number().min(70).max(740),
  location: z.enum(["farm", "home"]),
  role: z.enum(["livre", "galinheiro", "pomar", "rocado", "agua"]),
});
app.post(
  "/api/family/heartbeat",
  {
    config: {
      rateLimit: {
        max: 90,
        timeWindow: "1 minute",
        keyGenerator: (req: any) => digest(req.cookies.session || req.ip),
      },
    },
  },
  async (req) => {
    const u = await user(req),
      b = presenceInput.parse(req.body);
    const saved = (
      await query("SELECT state FROM saves WHERE user_id=$1", [u.id])
    ).rows[0]?.state;
    if (!saved) throw Error("Comece uma partida para entrar na família.");
    await query(
      `INSERT INTO presence(user_id,x,y,location,role,seen) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO UPDATE SET x=EXCLUDED.x,y=EXCLUDED.y,location=EXCLUDED.location,role=EXCLUDED.role,seen=EXCLUDED.seen`,
      [u.id, b.x, b.y, b.location, b.role, Date.now()],
    );
    const members = (
      await query(
        `SELECT p.user_id AS id,p.x,p.y,p.location,p.role,s.state->>'name' AS name,s.state->>'skin' AS skin,(s.state->>'hat')::boolean AS hat FROM presence p JOIN saves s ON s.user_id=p.user_id WHERE p.seen>$1 ORDER BY p.user_id LIMIT 100`,
        [Date.now() - 12000],
      )
    ).rows;
    const treasury = (
      await query("SELECT treasury FROM family_world WHERE id=1")
    ).rows[0].treasury;
    return { members, treasury, goal: 300 };
  },
);
app.post("/api/family/leave", async (req) => {
  const u = await user(req);
  await query("DELETE FROM presence WHERE user_id=$1", [u.id]);
  return { ok: true };
});
if (existsSync("dist")) {
  await app.register(serve, { root: resolve("dist") });
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith("/api")
      ? reply.code(404).send({ error: "Rota inexistente" })
      : reply.sendFile("index.html"),
  );
}
await app.listen({ port: Number(process.env.PORT || 3001), host: "0.0.0.0" });

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app.close();
  await close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
