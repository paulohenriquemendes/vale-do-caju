import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  initial,
  points,
  sectors,
  buyers,
  REGROW_MS,
} from "../shared/game";
test("caju delivery retains raw nuts and separation never duplicates rewards", () => {
  let s = initial();
  Object.assign(s, sectors.caju[0]);
  s = act(s, { kind: "pickup", item: "caju", target: 0 }, 1000);
  Object.assign(s, points.bench);
  s = act(s, { kind: "separate" }, 2000);
  assert.equal(s.inventory.castanha, 3);
  assert.throws(() => act(s, { kind: "separate" }, 3000));
  Object.assign(s, buyers.caju);
  s = act(s, { kind: "deliver" }, 4000);
  assert.equal(s.money, 81.5);
  assert.equal(s.inventory.castanha, 3);
  s = act(s, { kind: "trade", target: 0, item: "castanha", quantity: 3 }, 5000);
  assert.equal(s.money, 81.65);
  assert.equal(s.inventory.castanha, 0);
  assert.throws(() =>
    act(s, { kind: "trade", target: 0, item: "castanha", quantity: 1 }),
  );
  assert.throws(() =>
    act(s, { kind: "trade", target: 1, item: "alimento", quantity: -1 }),
  );
});
test("proximity, energy and inventory reject impossible actions without mutating input", () => {
  const s = initial();
  assert.throws(() => act(s, { kind: "harvest", target: 0 }));
  assert.equal(s.version, 0);
  assert.equal(s.energy, 100);
  s.x = 700;
  s.y = 220;
  s.energy = 0;
  assert.throws(() => act(s, { kind: "harvest", target: 0 }));
  assert.equal(s.inventory.caju, 0);
});
test("beans must be replanted and watered, while cashew trees can be renewed with a sapling", () => {
  let s = initial();
  Object.assign(s, sectors.feijao[0]);
  s = act(s, { kind: "pickup", item: "feijao", target: 0 }, 1000);
  s = act(s, { kind: "expire" }, 200000);
  assert.throws(() =>
    act(
      s,
      { kind: "tend", item: "feijao", activity: "plant", target: 0 },
      200000,
    ),
  );
  for (const activity of ["prepare", "plant", "water"])
    s = act(s, { kind: "tend", item: "feijao", activity, target: 0 }, 200000);
  assert.equal(s.inventory.semente, 2);
  assert.equal(s.water, 59);
  assert.throws(() =>
    act(s, { kind: "pickup", item: "feijao", target: 0 }, 319999),
  );
  s = act(s, { kind: "pickup", item: "feijao", target: 0 }, 320000);
  assert.equal(s.delivery?.quantity, 1);
  assert.equal(s.production.feijao[0].planted, false);
  s = act(s, { kind: "expire" }, 500000);
  Object.assign(s, sectors.caju[0]);
  s = act(s, { kind: "pickup", item: "caju", target: 0 }, 500000);
  s.inventory.muda = 1;
  for (const activity of ["prepare", "plant", "water"])
    s = act(s, { kind: "tend", item: "caju", activity, target: 0 }, 500001);
  assert.equal(s.production.caju[0].young, true);
  assert.equal(s.inventory.muda, 0);
  assert.equal(s.production.caju[0].readyAt, 740001);
  assert.throws(() =>
    act(s, { kind: "pickup", item: "caju", target: 0 }, 740000),
  );
  s = act(s, { kind: "pickup", item: "caju", target: 0 }, 740001);
  assert.equal(s.delivery?.quantity, 3);
});
test("story allows recovery while survival can lead to non-graphic death", () => {
  let story = initial(),
    survival = initial("Teste", "azul", "sobrevivencia");
  story.location = survival.location = "home";
  for (let i = 0; i < 20; i++) {
    story = act(story, { kind: "sleep" });
    survival = act(survival, { kind: "sleep" });
  }
  assert.ok(story.family.every((f) => f.alive && f.health >= 20));
  assert.ok(survival.family.every((f) => !f.alive));
  story = act(story, { kind: "care" });
  assert.ok(story.family.every((f) => f.health > 20));
});
