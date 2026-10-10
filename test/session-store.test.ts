import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemorySessionStore } from "../src/session/memory-session-store.ts";
import { SQLiteSessionStore } from "../src/session/sqlite-session-store.ts";
import { SessionConflictError, type SessionSnapshot, type SessionStore } from "../src/session/session-store.ts";
import { paired } from "./support/conversation-fixtures.ts";

const factories = {
  memory: () => ({ store: new MemorySessionStore(), close() {} }),
  sqlite: () => {
    const directory = mkdtempSync(join(tmpdir(), "session-contract-"));
    const store = new SQLiteSessionStore(join(directory, "sessions.sqlite"));
    return { store, close() { store.close(); rmSync(directory, { recursive: true, force: true }); } };
  },
};
const snapshot = (revision = 0): SessionSnapshot => ({ sessionId: "session", revision, messages: paired() });
const cases: Record<string, (store: SessionStore) => Promise<void>> = {
  async "missing session returns null"(store) { assert.equal(await store.load("missing"), null); },
  async "revision zero creates revision one"(store) {
    const saved = await store.save(snapshot());
    assert.deepEqual(saved, snapshot(1)); assert.deepEqual(await store.load("session"), saved);
  },
  async "duplicate create conflicts without changing history"(store) {
    const saved = await store.save(snapshot());
    await assert.rejects(store.save({ ...snapshot(), messages: [] }), SessionConflictError);
    assert.deepEqual(await store.load("session"), saved);
  },
  async "current revision updates and stale revision conflicts"(store) {
    await store.save(snapshot());
    const saved = await store.save({ ...snapshot(1), messages: [{ type: "user_input", content: "new" }] });
    assert.equal(saved.revision, 2);
    await assert.rejects(store.save(snapshot(1)), (error: unknown) => error instanceof SessionConflictError && error.sessionId === "session" && error.expectedRevision === 1);
    assert.deepEqual(await store.load("session"), saved);
  },
  async "updating a missing session does not create it"(store) {
    await assert.rejects(store.save(snapshot(1)), SessionConflictError);
    assert.equal(await store.load("session"), null);
  },
  async "invalid session ids and revisions rejected"(store) {
    for (const sessionId of ["", "  ", null, 1, undefined]) {
      await assert.rejects(store.load(sessionId as string), TypeError);
      await assert.rejects(store.save({ ...snapshot(), sessionId: sessionId as string }), TypeError);
    }
    for (const revision of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "0", null]) {
      await assert.rejects(store.save({ ...snapshot(), revision: revision as number }), RangeError);
    }
    for (const value of [null, [], "snapshot"]) await assert.rejects(store.save(value as unknown as SessionSnapshot), TypeError);
  },
  async "invalid structure and pairing cannot overwrite valid snapshot"(store) {
    const saved = await store.save(snapshot());
    for (const messages of [[{ type: "user_input", content: 3 }], paired().slice(0, 2), [...paired(), ...paired()]]) {
      await assert.rejects(store.save({ ...snapshot(1), messages: messages as SessionSnapshot["messages"] }), /Invalid conversation/);
      assert.deepEqual(await store.load("session"), saved);
    }
  },
  async "load and save deeply isolate both directions"(store) {
    const input = snapshot(); const expected = structuredClone(input.messages);
    const pending = store.save(input);
    input.messages.length = 0;
    const saved = await pending;
    const call = saved.messages[1]; assert.ok(call?.type === "model_output");
    (call.toolCalls![0]!.arguments as { nested: { value: number } }).nested.value = 99;
    saved.sessionId = "changed"; saved.revision = 99;
    const loaded = await store.load("session"); assert.ok(loaded);
    assert.deepEqual(loaded.messages, expected);
    const loadedCall = loaded.messages[1]; assert.ok(loadedCall?.type === "model_output");
    (loadedCall.toolCalls![0]!.arguments as { nested: { value: number } }).nested.value = 88;
    loaded.messages.length = 0;
    assert.deepEqual((await store.load("session"))?.messages, expected);
  },
  async "safe revision extremes cannot bypass CAS or overflow"(store) {
    await assert.rejects(store.save(snapshot(Number.MAX_SAFE_INTEGER - 1)), SessionConflictError);
    await assert.rejects(store.save(snapshot(Number.MAX_SAFE_INTEGER)), RangeError);
    assert.equal(await store.load("session"), null);
    const saved = await store.save(snapshot());
    await assert.rejects(store.save(snapshot(Number.MAX_SAFE_INTEGER)), RangeError);
    assert.deepEqual(await store.load("session"), saved);
  },
  async "simultaneous writers have exactly one winner"(store) {
    const results = await Promise.allSettled([store.save(snapshot()), store.save(snapshot())]);
    assert.deepEqual(results.map((r) => r.status), ["fulfilled", "rejected"]);
    const loser = results[1]; assert.ok(loser?.status === "rejected");
    assert.ok(loser.reason instanceof SessionConflictError);
    assert.equal((await store.load("session"))?.revision, 1);
  },
};
for (const [name, factory] of Object.entries(factories)) {
  for (const [behavior, check] of Object.entries(cases)) test(`${name}: ${behavior}`, async () => {
    const resource = factory();
    try { await check(resource.store); } finally { resource.close(); }
  });
}
