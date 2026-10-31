import { test } from "node:test";
import assert from "node:assert/strict";
import { act, initial, points } from "../shared/game";
test("harvest, separate, sell and buy form an authoritative economy", () => {
  let s = initial();
  s = act(s, { kind: "move", ...points.trees[0] });
  s = act(s, { kind: "harvest", target: 0 });
  assert.equal(s.inventory.caju, 6);
  assert.throws(() => act(s, { kind: "harvest", target: 0 }));
  s = act(s, { kind: "move", ...points.bench });
  s = act(s, { kind: "separate" });
  assert.equal(s.inventory.castanha, 6);
  s = act(s, { kind: "move", ...points.market });
  s = act(s, { kind: "trade", target: 0, item: "castanha", quantity: 6 });
  assert.equal(s.money, 110);
  s = act(s, { kind: "trade", target: 1, item: "alimento", quantity: 2 });
  assert.equal(s.money, 74);
  assert.equal(s.inventory.alimento, 4);
  assert.throws(() =>
    act(s, { kind: "trade", target: 1, item: "alimento", quantity: -2 }),
  );
  assert.throws(() =>
    act(s, { kind: "trade", target: 0, item: "castanha", quantity: 1 }),
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
test("crops need watering and elapsed days; rain replenishes water", () => {
  let s = initial();
  s.x = points.plots.x;
  s.y = points.plots.y;
  s.plots[0] = { planted: 0, watered: false };
  s = act(s, { kind: "plant", target: 0 });
  assert.throws(() => act(s, { kind: "crop", target: 0 }));
  s = act(s, { kind: "water" });
  s.location = "home";
  for (let i = 0; i < 3; i++) s = act(s, { kind: "sleep" });
  assert.equal(s.rain, true);
  assert.equal(s.water, 90);
  s.location = "farm";
  s = act(s, { kind: "crop", target: 0 });
  assert.equal(s.inventory.feijao, 5);
  assert.equal(s.plots[0].planted, 0);
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
