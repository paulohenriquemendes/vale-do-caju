import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_URL || "http://localhost:3001";
test("API: accounts, private saves, duplicate commands, conflicts, CSRF and logout", async () => {
  let cookie = "";
  const call = async (
    path: string,
    body?: any,
    session = cookie,
    origin?: string,
  ) => {
    const r = await fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: session,
        ...(origin ? { Origin: origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
      headers: r.headers,
    };
  };
  const email = `test-${randomUUID()}@valedocaju.test`;
  const r = await call("register", {
    email,
    password: "TestingCaju#2027",
    nickname: "Teste API",
  });
  assert.equal(r.status, 200);
  cookie = r.cookie;
  assert.match(r.headers.get("set-cookie")!, /HttpOnly/i);
  assert.match(r.headers.get("set-cookie")!, /SameSite=Strict/i);
  assert.equal((await call("save", undefined, "")).status, 401);
  assert.equal((await call("save")).body, null);
  let s = (
    await call("new", {
      name: "Agricultor Teste",
      skin: "verde",
      mode: "historia",
    })
  ).body;
  assert.equal(s.money, 80);
  const cmd = {
    id: randomUUID(),
    version: s.version,
    action: { kind: "move", x: 700, y: 220 },
  };
  const moved = await call("action", cmd);
  assert.equal(moved.status, 200);
  assert.deepEqual((await call("action", cmd)).body, moved.body);
  assert.equal(
    (await call("action", { ...cmd, id: randomUUID() })).status,
    409,
  );
  s = moved.body;
  const harvest = await call("action", {
    id: randomUUID(),
    version: s.version,
    action: { kind: "harvest", target: 0, money: 99999 },
  });
  assert.equal(harvest.body.money, 80);
  assert.equal(harvest.body.inventory.caju, 6);
  assert.equal(
    (
      await call("action", {
        id: randomUUID(),
        version: harvest.body.version,
        action: { kind: "trade", item: "caju", quantity: 6, target: 0 },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("logout", {}, cookie, "https://evil.invalid")).status,
    403,
  );
  const other = await call(
    "register",
    {
      email: `other-${randomUUID()}@valedocaju.test`,
      password: "TestingCaju#2027",
      nickname: "Outra conta",
    },
    "",
  );
  assert.equal((await call("save", undefined, other.cookie)).body, null);
  const login = await call(
    "login",
    { email, password: "TestingCaju#2027" },
    "",
  );
  assert.equal(
    (await call("save", undefined, login.cookie)).body.inventory.caju,
    6,
  );
  assert.equal(
    (await call("login", { email, password: "WrongPass#2027" }, "")).status,
    400,
  );
  assert.equal((await call("logout", {})).status, 200);
  assert.equal((await call("me")).status, 401);
});
