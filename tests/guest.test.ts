import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test("first visit opens a saved guest game; claiming retains progress and later login restores it", async () => {
  const base = process.env.TEST_URL || "http://localhost:3001";
  let cookie = "";
  async function request(path: string, body?: unknown) {
    const r = await fetch(`${base}/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    cookie = r.headers.get("set-cookie")?.split(";")[0] || cookie;
    return { status: r.status, body: await r.json() };
  }
  assert.equal((await request("me")).status, 401);
  const guest = await request("guest", {});
  assert.equal(guest.status, 200);
  assert.equal(guest.body.guest, true);
  assert.equal((await request("guest", {})).body.id, guest.body.id);
  let s = (await request("save")).body;
  s = (
    await request("action", {
      id: randomUUID(),
      version: s.version,
      action: { kind: "donate", quantity: 7 },
    })
  ).body;
  assert.equal(s.money, 73);
  const credentials = {
    email: `claim-${randomUUID()}@valedocaju.test`,
    password: "ClaimSavedGame#2027",
    nickname: "Irmã Visitante",
  };
  const claimed = await request("claim", credentials);
  assert.equal(claimed.status, 200);
  assert.equal(claimed.body.id, guest.body.id);
  assert.equal((await request("me")).body.guest, false);
  assert.equal((await request("save")).body.money, 73);
  assert.equal((await request("save")).body.name, credentials.nickname);
  assert.equal(
    (
      await request("claim", {
        ...credentials,
        email: `second-${randomUUID()}@valedocaju.test`,
      })
    ).status,
    400,
  );
  await request("logout", {});
  cookie = "";
  assert.equal((await request("login", credentials)).body.id, guest.body.id);
  assert.equal((await request("save")).body.contributed, 7);
  await request("logout", {});
});
