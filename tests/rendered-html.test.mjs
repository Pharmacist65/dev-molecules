import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function getWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("server-renders the Dev Molecules product shell", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("https://molecules.example/", {
      headers: {
        accept: "text/html",
        host: "molecules.example",
        "x-forwarded-host": "molecules.example",
        "x-forwarded-proto": "https",
      },
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Dev Molecules — Pharmaceutical Molecular Universe<\/title>/i);
  assert.match(html, /DEV MOLECULES/);
  assert.match(html, /Molecular Universe/);
  assert.match(html, /Kimlik doğrulandı/);
  assert.match(html, /Explore/);
  assert.match(html, /Learn/);
  assert.match(html, /Build/);
  assert.match(html, /Teach/);
  assert.match(html, /Discover/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
  assert.match(html, /property="og:image" content="https:\/\/molecules\.example\/og\.png"/i);
});

test("ships a bespoke social card", async () => {
  await access(new URL("../public/og.png", import.meta.url));
  const image = await readFile(new URL("../public/og.png", import.meta.url));
  assert.ok(image.byteLength > 100_000);
  assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
});

test("evidence API fails closed to the curated card without a key", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("https://molecules.example/api/evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        moleculeId: "molecule:propranolol",
        question: "Hangi kimlik ve sentez kanıtı var?",
      }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const card = await response.json();
  assert.equal(card.mode, "curated-fallback");
  assert.equal(card.identityStatus, "exact-curated-match");
  assert.equal(card.synthesisStatus, "educational-story-only");
  assert.equal(card.biologicalStatus, "not-assessed");
  assert.equal(card.notFoundIsNoveltyEvidence, false);
  assert.equal(card.notClinicalOrPatentAdvice, true);
  assert.ok(card.sources.some((source) => source.id === "source:pubchem-4946"));
});

test("rejects evidence requests for an unknown catalog identity", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("https://molecules.example/api/evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moleculeId: "molecule:unknown", question: "Assess" }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 404);
});
