import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initial, act, points } from "../shared/game";

test("poultry produces six eggs once per day and nearby buyer pays in reais", () => {
  let s = initial("Irmã");
  s.x = points.coop.x;
  s.y = points.coop.y;
  s = act(s, { kind: "poultry" });
  assert.equal(s.inventory.ovo, 6);
  assert.equal(s.inventory.racao, 1);
  assert.equal(s.energy, 92);
  assert.throws(() => act(s, { kind: "poultry" }), /já cuidou/);
  s = act(s, { kind: "move", ...points.eggBuyer });
  s = act(s, { kind: "trade", item: "ovo", quantity: 6, target: 0 });
  assert.equal(s.money, 104);
  assert.equal(s.inventory.ovo, 0);
  assert.equal(s.transactions.at(-1)?.amount, 24);
  s = act(s, { kind: "trade", item: "racao", quantity: 1, target: 1 });
  assert.equal(s.money, 98);
  s.x = 900;
  s.y = 200;
  assert.throws(
    () => act(s, { kind: "trade", item: "racao", quantity: 1, target: 1 }),
    /Aproxime/,
  );
  s.location = "home";
  s = act(s, { kind: "sleep" });
  s.location = "farm";
  s.x = points.coop.x;
  s.y = points.coop.y;
  assert.equal(act(s, { kind: "poultry" }).inventory.ovo, 6);
});
test("contributions cannot exceed balance or be negative; old saves gain new fields", () => {
  const old = initial();
  delete (old.inventory as any).ovo;
  delete (old.inventory as any).racao;
  delete (old as any).contributed;
  const s = act(old, { kind: "donate", quantity: 10 });
  assert.equal(s.money, 70);
  assert.equal(s.contributed, 10);
  assert.equal(s.inventory.racao, 2);
  assert.equal(s.family[2].name, "Pai João");
  assert.throws(() => act(s, { kind: "donate", quantity: -1 }));
  assert.throws(() => act(s, { kind: "donate", quantity: 71 }));
});
test("two authenticated siblings see each other; concurrent contributions persist exactly once", async () => {
  const base = process.env.TEST_URL || "http://localhost:3001";
  async function request(path: string, body: any, cookie = "") {
    const r = await fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
    };
  }
  const accounts = [];
  for (const name of ["Irmã Teste A", "Irmão Teste B"]) {
    const a = await request("register", {
      nickname: name,
      email: `coop-${randomUUID()}@valedocaju.test`,
      password: "TesteFamilia#2027",
    });
    assert.equal(a.status, 200);
    accounts.push(a);
    assert.equal(
      (await request("new", { name, skin: "azul", mode: "historia" }, a.cookie))
        .status,
      200,
    );
  }
  const [a, b] = accounts;
  const pa = { x: 330, y: 300, location: "farm", role: "galinheiro" },
    pb = { x: 650, y: 350, location: "farm", role: "pomar" };
  await request("family/heartbeat", pa, a.cookie);
  const view = (await request("family/heartbeat", pb, b.cookie)).body;
  assert.ok(
    view.members.some(
      (m: any) => m.id === a.body.id && m.role === "galinheiro",
    ),
  );
  assert.ok(
    view.members.some((m: any) => m.id === b.body.id && m.role === "pomar"),
  );
  assert.ok(
    view.members.every(
      (m: any) => !("email" in m) && !("money" in m) && !("password" in m),
    ),
  );
  const baseline = view.treasury;
  const ca = {
      id: randomUUID(),
      version: 0,
      action: { kind: "donate", quantity: 10 },
    },
    cb = {
      id: randomUUID(),
      version: 0,
      action: { kind: "donate", quantity: 15 },
    };
  const results = await Promise.all([
    request("action", ca, a.cookie),
    request("action", cb, b.cookie),
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200],
  );
  assert.equal((await request("action", ca, a.cookie)).status, 200);
  const after = (await request("family/heartbeat", pa, a.cookie)).body;
  assert.equal(after.treasury, baseline + 25);
  assert.equal((await request("save", undefined, a.cookie)).body.money, 70);
  assert.equal((await request("save", undefined, b.cookie)).body.money, 65);
  assert.equal((await request("family/heartbeat", pa)).status, 401);
  await request("family/leave", {}, b.cookie);
  assert.ok(
    !(await request("family/heartbeat", pa, a.cookie)).body.members.some(
      (m: any) => m.id === b.body.id,
    ),
  );
  await request("family/leave", {}, a.cookie);
});
