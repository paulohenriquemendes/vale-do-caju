import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  act,
  initial,
  restore,
  sectors,
  buyers,
  WORLD,
  DELIVERY_MS,
  REGROW_MS,
} from "../shared/game";

test("three expanded sectors contain ten ready production points and buyers outside the gate", () => {
  const s = initial();
  for (const item of ["ovo", "caju", "feijao"] as const) {
    assert.equal(sectors[item].length, 10);
    assert.equal(new Set(sectors[item].map((p) => `${p.x}:${p.y}`)).size, 10);
    assert.ok(
      sectors[item].every((p) => p.x < WORLD.width && p.y < WORLD.fenceY),
    );
    assert.ok(buyers[item].y > WORLD.fenceY);
  }
  assert.equal(s.trees.length, 10);
  assert.ok(
    s.plots.length === 10 &&
      s.plots.every((p) => p.planted && p.watered && s.day - p.planted >= 3),
  );
});
test("passing a drop starts a persistent clock; more pickups never extend it and delivery pays once", () => {
  const now = 1_000_000;
  let s = initial();
  Object.assign(s, sectors.caju[0]);
  s = act(s, { kind: "pickup", item: "caju", target: 0 }, now);
  assert.equal(s.delivery?.deadline, now + DELIVERY_MS);
  assert.equal(s.inventory.caju, 0); // Timed loads cannot bypass delivery through the shop.
  assert.throws(
    () => act(s, { kind: "pickup", item: "caju", target: 0 }, now + 1000),
    /Aguarde/,
  );
  Object.assign(s, sectors.caju[1]);
  s = act(s, { kind: "pickup", item: "caju", target: 1 }, now + 10_000);
  assert.equal(s.delivery?.quantity, 6);
  assert.equal(s.delivery?.deadline, now + DELIVERY_MS);
  assert.equal(
    restore(JSON.parse(JSON.stringify(s))).delivery?.deadline,
    now + DELIVERY_MS,
  );
  assert.throws(() => act(s, { kind: "deliver" }, now + 11_000), /Aproxime/);
  Object.assign(s, buyers.caju);
  s = act(s, { kind: "deliver" }, now + 12_000);
  assert.equal(s.money, 98);
  assert.equal(s.delivery, null);
  assert.throws(() => act(s, { kind: "deliver" }, now + 13_000));
});
test("expiry is server-authoritative, does not fine the player, and regrowth follows real time", () => {
  let s = initial();
  Object.assign(s, sectors.feijao[0]);
  s = act(s, { kind: "pickup", item: "feijao", target: 0 }, 1000);
  Object.assign(s, buyers.feijao);
  assert.throws(() => act(s, { kind: "deliver" }, 1000 + DELIVERY_MS));
  s = act(s, { kind: "expire" }, 1000 + DELIVERY_MS);
  assert.equal(s.delivery, null);
  assert.equal(s.money, 80);
  Object.assign(s, sectors.feijao[0]);
  assert.throws(() =>
    act(s, { kind: "pickup", item: "feijao", target: 0 }, 1000 + REGROW_MS - 1),
  );
  s = act(s, { kind: "pickup", item: "feijao", target: 0 }, 1000 + REGROW_MS);
  assert.equal(s.delivery?.quantity, 3);
});
test("pickup rejects distant, invalid and mixed loads and upgrades older saves without losing money", () => {
  const old = initial();
  delete (old as any).delivery;
  delete (old as any).pickups;
  old.trees = old.trees.slice(0, 4);
  old.plots = old.plots.slice(0, 4);
  const upgraded = restore(old);
  assert.equal(upgraded.trees.length, 10);
  assert.equal(upgraded.money, 80);
  assert.deepEqual(upgraded.pickups, {});
  assert.throws(() =>
    act(upgraded, { kind: "pickup", item: "ovo", target: 0 }, 1000),
  );
  Object.assign(upgraded, sectors.ovo[0]);
  assert.throws(() =>
    act(upgraded, { kind: "pickup", item: "racao", target: 0 }, 1000),
  );
  assert.throws(() =>
    act(upgraded, { kind: "pickup", item: "ovo", target: 10 }, 1000),
  );
  let s = act(upgraded, { kind: "pickup", item: "ovo", target: 0 }, 1000);
  Object.assign(s, sectors.caju[0]);
  assert.throws(
    () => act(s, { kind: "pickup", item: "caju", target: 0 }, 1100),
    /carga atual/,
  );
});

test("API persists an expanded-map delivery and replay never duplicates its payment", async () => {
  const base = process.env.TEST_URL || "http://localhost:3001";
  let cookie = "";
  async function request(path: string, body?: unknown) {
    const r = await fetch(`${base}/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    cookie = r.headers.get("set-cookie")?.split(";")[0] || cookie;
    const result = await r.json();
    assert.equal(r.status, 200, JSON.stringify(result));
    return result;
  }
  await request("register", {
    email: `delivery-${randomUUID()}@valedocaju.test`,
    nickname: "Entregador Teste",
    password: "EntregaTeste#2027",
  });
  let s = await request("new", {
    name: "Entregador Teste",
    skin: "azul",
    mode: "historia",
  });
  const command = async (action: unknown) =>
    (s = await request("action", {
      id: randomUUID(),
      version: s.version,
      action,
    }));
  await command({ kind: "move", ...sectors.feijao[9] });
  await command({
    kind: "pickup",
    item: "feijao",
    target: 9,
    deadline: Date.now() + 9999999,
  });
  assert.equal(s.delivery.quantity, 3);
  assert.ok(s.delivery.deadline - Date.now() <= DELIVERY_MS);
  assert.equal((await request("save")).delivery.deadline, s.delivery.deadline);
  await command({ kind: "move", ...buyers.feijao });
  await request("family/heartbeat", {
    x: s.x,
    y: s.y,
    location: "farm",
    role: "rocado",
  });
  const delivery = {
    id: randomUUID(),
    version: s.version,
    action: { kind: "deliver" },
  };
  s = await request("action", delivery);
  assert.equal(s.money, 104);
  assert.equal(s.delivery, null);
  assert.equal((await request("action", delivery)).money, 104);
  assert.equal((await request("save")).transactions.at(-1).amount, 24);
  await request("logout", {});
});
