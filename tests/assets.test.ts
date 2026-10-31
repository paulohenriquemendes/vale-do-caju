import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test(
  "production build serves the page and original game artwork",
  { skip: !existsSync("dist/index.html") },
  async () => {
    const base = process.env.TEST_URL || "http://localhost:3001";
    const page = await fetch(base + "/");
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Vale do Caju/);
    for (const file of [
      "farm-retro.png",
      "farmer-retro.png",
      "family-retro.png",
    ]) {
      const image = await fetch(base + "/assets/" + file);
      assert.equal(image.status, 200);
      assert.match(image.headers.get("content-type") || "", /image\/png/);
      assert.ok((await image.arrayBuffer()).byteLength > 10000);
    }
  },
);
