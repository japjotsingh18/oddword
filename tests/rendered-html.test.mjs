import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Oddword landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Oddword — Find the odd one out<\/title>/i);
  assert.match(html, /Same vibe\./);
  assert.match(html, /Different word\./);
  assert.match(html, /Create a room/);
  assert.match(html, /Join with a code/);
  assert.match(html, /Firebase connected · real-time play ready/);
  assert.match(html, /300<!-- --> pairs/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps Firebase configuration outside tracked source", async () => {
  const [firebaseSource, environmentTemplate, gitignore] = await Promise.all([
    readFile(new URL("../lib/firebase.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);

  assert.match(firebaseSource, /process\.env\.NEXT_PUBLIC_FIREBASE_API_KEY/);
  assert.match(firebaseSource, /process\.env\.NEXT_PUBLIC_FIREBASE_DATABASE_URL/);
  assert.match(environmentTemplate, /NEXT_PUBLIC_FIREBASE_API_KEY=\s*$/m);
  assert.match(environmentTemplate, /NEXT_PUBLIC_FIREBASE_DATABASE_URL=\s*$/m);
  assert.match(gitignore, /^\.env\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.doesNotMatch(environmentTemplate, /AIza[0-9A-Za-z_-]{30,}/);
});
