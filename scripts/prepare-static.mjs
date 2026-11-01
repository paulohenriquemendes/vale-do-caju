// Vercel's require instrumentation cannot load the ESM-only content-disposition 2.
// Keep the patched security release of @fastify/static and load its ESM dependency
// asynchronously when the Fastify plugin initializes instead of downgrading it.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const file = require.resolve('@fastify/static');
const source = readFileSync(file, 'utf8');
const original = "const { create } = require('content-disposition')";
const init = 'async function fastifyStatic (fastify, opts) {';
const marker = '// vale: async ESM compatibility';
if (!source.includes(marker)) {
  if (!source.includes(original) || !source.includes(init)) {
    throw new Error('Review @fastify/static ESM compatibility patch before building.');
  }
  writeFileSync(file, source.replace(original, `let create ${marker}`)
    .replace(init, `${init}\n  ;({ create } = await import('content-disposition'))`));
}
