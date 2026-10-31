import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import net from "node:net";

// Run integration tests against a disposable database, never the user's save files.
const directory = await mkdtemp(join(tmpdir(), "vale-do-caju-test-"));
const port = await new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.on("error", reject);
  socket.listen(0, "127.0.0.1", () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    DATABASE_URL: "",
    PGLITE_DATA_DIR: join(directory, "postgres"),
    APP_ORIGIN: url,
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let log = "";
server.stdout.on("data", (data) => {
  log = (log + data).slice(-12000);
});
server.stderr.on("data", (data) => {
  log = (log + data).slice(-12000);
});
let code = 1;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw Error("Test API stopped: " + log);
    try {
      const r = await fetch(url + "/api/me");
      if (r.status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw Error("Test API did not start: " + log);
  const files = (await readdir("tests"))
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => join("tests", f));
  const tests = spawn(
    process.execPath,
    ["--import", "tsx", "--test", ...files],
    {
      env: { ...process.env, TEST_URL: url },
      stdio: "inherit",
      windowsHide: true,
    },
  );
  code = await new Promise((resolve, reject) => {
    tests.once("error", reject);
    tests.once("exit", (value) => resolve(value ?? 1));
  });
} catch (error) {
  console.error(error);
} finally {
  if (server.exitCode === null) {
    const stopped = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await stopped;
  }
  // Only the fresh directory returned by mkdtemp under the OS temp root is removed.
  const parent = resolve(directory, "..");
  if (
    parent === resolve(tmpdir()) &&
    basename(directory).startsWith("vale-do-caju-test-")
  )
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 4,
      retryDelay: 250,
    });
}
process.exitCode = code;
