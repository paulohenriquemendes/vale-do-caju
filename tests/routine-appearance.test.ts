import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  act,
  initial,
  restore,
  points,
  sectors,
  isNight,
} from "../shared/game";
import { catalog, tones } from "../shared/appearance";

test("man or woman selection is free, reversible and preserves progress and wardrobe", () => {
  let s = act(initial("Ana"), { kind: "appearance", cosmetic: "hair-braid" });
  const before = structuredClone(s);
  s = act(s, { kind: "appearance", gender: "mulher" });
  assert.equal(s.appearance.gender, "mulher");
  assert.equal(s.money, before.money);
  assert.equal(s.appearance.hair, "hair-braid");
  assert.deepEqual(s.owned, before.owned);
  assert.deepEqual(s.production, before.production);
  assert.equal(
    restore(JSON.parse(JSON.stringify(s))).appearance.gender,
    "mulher",
  );
  assert.equal(
    act(s, { kind: "appearance", gender: "homem" }).appearance.gender,
    "homem",
  );
  delete (s.appearance as any).gender;
  assert.equal(restore(s).appearance.gender, "homem");
  assert.throws(() => act(s, { kind: "appearance", gender: "invalid" as any }));
});

test("renaming keeps progress and rejects blank names and markup", () => {
  const original = initial("Antes");
  original.money = 37.45;
  const next = act(original, { kind: "rename", name: "  Ana do Caju  " });
  assert.equal(next.name, "Ana do Caju");
  assert.equal(next.family[0].name, next.name);
  assert.equal(next.money, 37.45);
  assert.equal(original.name, "Antes");
  for (const name of [" ", "A", "<script>", "a".repeat(31)])
    assert.throws(() => act(next, { kind: "rename", name }));
});

test("cosmetics charge once, reject insufficient funds and preserve free basic customization", () => {
  let s = initial();
  s = act(s, { kind: "appearance", cosmetic: "hair-curls" });
  assert.equal(s.money, 55);
  assert.equal(
    act(s, { kind: "appearance", cosmetic: "hair-curls" }).money,
    55,
  );
  s = act(s, { kind: "appearance", tone: tones[5], cosmetic: "hair-cropped" });
  assert.equal(s.money, 55);
  assert.equal(s.appearance.tone, tones[5]);
  for (const slot of ["shirt", "pants", "shoes"] as const) {
    s.money = 100;
    const item = catalog.find(
      (c) => c.slot === slot && !s.owned.includes(c.id),
    )!;
    s = act(s, { kind: "appearance", cosmetic: item.id });
    assert.equal(s.money, 100 - item.price);
    assert.equal(
      restore(JSON.parse(JSON.stringify(s))).appearance[slot],
      item.id,
    );
  }
  s.money = 0;
  assert.throws(
    () => act(s, { kind: "appearance", cosmetic: "hair-braid" }),
    /Saldo/,
  );
  assert.throws(
    () => act(s, { kind: "appearance", cosmetic: "fake" }),
    /inválido/,
  );
  assert.throws(() => act(s, { kind: "appearance", tone: "red" }), /inválido/);
  delete (s as any).appearance;
  delete (s as any).owned;
  assert.ok(restore(s).owned.length >= 3);
});

test("mother gives water and timed meals; dinner closes work until sunrise", () => {
  let s = initial();
  Object.assign(s, sectors.ovo[0]);
  s = act(s, { kind: "pickup", item: "ovo", target: 0 }, 1000);
  assert.equal(s.family[0].thirst, 84);
  assert.throws(() => act(s, { kind: "drinkMother" }), /Aproxime/);
  Object.assign(s, points.family);
  s = act(s, { kind: "drinkMother" });
  assert.equal(s.family[0].thirst, 100);
  assert.equal(s.water, 59);
  assert.throws(() => act(s, { kind: "meal", target: 0 }), /hora/);
  s.minute = 540;
  s = act(s, { kind: "meal", target: 0 });
  assert.throws(() => act(s, { kind: "meal", target: 0 }), /já fez/);
  s.minute = 720;
  s = act(s, { kind: "meal", target: 1 });
  s.minute = 1020;
  s = act(s, { kind: "meal", target: 2 });
  assert.ok(isNight(s));
  for (const kind of [
    "pickup",
    "deliver",
    "trade",
    "poultry",
    "harvest",
    "crop",
    "refill",
  ])
    assert.throws(() => act(s, { kind }), /Fechado/);
  s.location = "home";
  s = act(s, { kind: "sleep" });
  assert.equal(isNight(s), false);
  assert.deepEqual(s.meals, []);
});

test("active time drains needs, excludes offline time, and thirst can end the journey", () => {
  let s = initial();
  s = act(s, { kind: "routine" }, 1000);
  s = act(s, { kind: "routine" }, 16000);
  assert.equal(s.minute, 430);
  assert.equal(s.family[0].thirst, 88);
  s = act(s, { kind: "routine" }, 9999999);
  assert.equal(s.family[0].thirst, 88);
  s.family[0].thirst = 0;
  for (let i = 1; i <= 5; i++)
    s = act(s, { kind: "routine" }, 9999999 + i * 15000);
  assert.equal(s.family[0].alive, false);
  s = act(s, { kind: "restartDay" });
  assert.equal(s.family[0].alive, true);
  assert.equal(s.location, "home");
});

test("four siblings share an IP without sharing limits, purchases or wardrobe", async () => {
  const base = process.env.TEST_URL!;
  const request = async (path: string, cookie: string, body?: any) => {
    const r = await fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0] || cookie,
    };
  };
  const clients = [];
  for (let i = 0; i < 4; i++) {
    const c = await request("guest", "", {});
    assert.equal(c.status, 200);
    clients.push(c);
  }
  const presence = { x: 330, y: 300, location: "farm", role: "pomar" };
  await Promise.all(
    clients.map((c) => request("family/heartbeat", c.cookie, presence)),
  );
  for (const c of clients) {
    const view = await request("family/heartbeat", c.cookie, presence);
    for (const sibling of clients)
      assert.ok(
        view.body.members.some(
          (m: any) => m.id === sibling.body.id && m.appearance,
        ),
      );
  }
  // 240 reads from one IP: each session is below its own 200/min limit.
  const reads = await Promise.all(
    clients.map(async (c) => {
      for (let i = 0; i < 60; i++)
        assert.equal((await request("save", c.cookie)).status, 200);
    }),
  );
  const c = clients[0],
    before = (await request("save", c.cookie)).body;
  const command = {
    id: randomUUID(),
    version: before.version,
    action: { kind: "appearance", cosmetic: "hair-curls", gender: "mulher" },
  };
  const attempts = await Promise.all([
    request("action", c.cookie, command),
    request("action", c.cookie, command),
  ]);
  assert.ok(attempts.every((r) => r.status === 200));
  assert.equal((await request("save", c.cookie)).body.money, 55);
  assert.equal(
    (await request("save", c.cookie)).body.appearance.gender,
    "mulher",
  );
  const roster = (
    await request("family/heartbeat", clients[1].cookie, presence)
  ).body.members;
  assert.equal(
    roster.find((m: any) => m.id === c.body.id).appearance.hair,
    "hair-curls",
  );
  assert.equal(
    roster.find((m: any) => m.id === c.body.id).appearance.gender,
    "mulher",
  );
  assert.equal((await request("save", clients[1].cookie)).body.money, 80);
  await request("family/leave", c.cookie, {});
  assert.ok(
    !(
      await request("family/heartbeat", clients[1].cookie, presence)
    ).body.members.some((m: any) => m.id === c.body.id),
  );
  await request("family/heartbeat", c.cookie, presence);
  assert.ok(
    (
      await request("family/heartbeat", clients[1].cookie, presence)
    ).body.members.some((m: any) => m.id === c.body.id),
  );
  await Promise.all(clients.map((c) => request("family/leave", c.cookie, {})));
});
