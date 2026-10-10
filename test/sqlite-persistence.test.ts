import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { SQLiteSessionStore } from "../src/session/sqlite-session-store.ts";
import { SessionConflictError } from "../src/session/session-store.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";
import { finalResponse, paired } from "./support/conversation-fixtures.ts";
import { toModelMessage } from "../src/messages/to-model-message.ts";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "sqlite-recovery-"));
  return { directory, filename: join(directory, "sessions.sqlite"), cleanup() { rmSync(directory, { recursive: true, force: true }); } };
}

test("SQLite close/reopen recovers into a new runtime and increments revision", async () => {
  const f = fixture(); let store = new SQLiteSessionStore(f.filename);
  try {
    const first = new AgentRuntime(new MockModelProvider([finalResponse])); await first.run("hello");
    await store.save({ sessionId: "s", revision: 0, messages: first.getMessages() }); store.close();
    store = new SQLiteSessionStore(f.filename);
    const loaded = await store.load("s"); assert.ok(loaded); assert.equal(loaded.revision, 1);
    const provider = new MockModelProvider([finalResponse]);
    const recovered = new AgentRuntime(provider, { initialMessages: loaded.messages });
    await recovered.run("next");
    assert.deepEqual(provider.requests[0]?.messages.slice(0, 2), first.getMessages().map(toModelMessage));
    const saved = await store.save({ ...loaded, messages: recovered.getMessages() });
    assert.equal(saved.revision, 2); assert.deepEqual(await store.load("s"), saved);
  } finally { store.close(); f.cleanup(); }
});

test("independent SQLite connections cannot overwrite the same old revision", async () => {
  const f = fixture(); const one = new SQLiteSessionStore(f.filename); const two = new SQLiteSessionStore(f.filename);
  try {
    await one.save({ sessionId: "s", revision: 0, messages: [] });
    const a = await one.load("s"); const b = await two.load("s"); assert.ok(a && b);
    const saved = await one.save({ ...a, messages: paired() });
    await assert.rejects(two.save({ ...b, messages: [{ type: "user_input", content: "loser" }] }), SessionConflictError);
    assert.deepEqual(await two.load("s"), saved);
    await assert.rejects(two.save({ sessionId: "s", revision: 0, messages: [] }), SessionConflictError);
  } finally { one.close(); two.close(); f.cleanup(); }
});

test("SQLite revisions reach the maximum safely and cannot overflow", async () => {
  const f = fixture(); const store = new SQLiteSessionStore(f.filename); const raw = new Database(f.filename);
  try {
    raw.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run("s", BigInt(Number.MAX_SAFE_INTEGER - 1), "[]");
    const loaded = await store.load("s"); assert.ok(loaded);
    const saved = await store.save(loaded); assert.equal(saved.revision, Number.MAX_SAFE_INTEGER);
    await assert.rejects(store.save(saved), RangeError); assert.deepEqual(await store.load("s"), saved);
  } finally { raw.close(); store.close(); f.cleanup(); }
});

for (const [name, json] of [
  ["malformed JSON", "{"], ["bad structure", '[{"type":"user_input","content":1}]'],
  ["incomplete batch", JSON.stringify(paired().slice(0, 2))], ["wrong JSON root", "null"],
]) test(`SQLite load rejects ${name} instead of returning null or conflict`, async () => {
  const f = fixture(); const store = new SQLiteSessionStore(f.filename); const raw = new Database(f.filename);
  try {
    raw.prepare("INSERT INTO sessions VALUES (?, 1, ?)").run("s", json);
    await assert.rejects(store.load("s"), (error: unknown) => error instanceof Error && !(error instanceof SessionConflictError));
  } finally { raw.close(); store.close(); f.cleanup(); }
});

for (const revision of [0n, -1n, 9007199254740992n, 9223372036854775807n, 1.5, "bad"]) {
  test(`SQLite load rejects damaged revision ${revision}`, async () => {
    const f = fixture(); const store = new SQLiteSessionStore(f.filename); const raw = new Database(f.filename);
    try {
      raw.pragma("ignore_check_constraints = ON");
      raw.prepare("INSERT INTO sessions VALUES (?, ?, '[]')").run("s", revision);
      await assert.rejects(store.load("s"), RangeError);
    } finally { raw.close(); store.close(); f.cleanup(); }
  });
}

test("SQLite operational and constraint errors retain their own error identity", async () => {
  const f = fixture(); const store = new SQLiteSessionStore(f.filename); const raw = new Database(f.filename);
  try {
    raw.exec("CREATE TRIGGER deny_insert BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'write denied'); END");
    await assert.rejects(store.save({ sessionId: "s", revision: 0, messages: [] }), (e: unknown) => e instanceof Database.SqliteError && e.code === "SQLITE_CONSTRAINT_TRIGGER" && !(e instanceof SessionConflictError));
    assert.equal(await store.load("s"), null);
    raw.exec("DROP TABLE sessions");
    await assert.rejects(store.load("s"), Database.SqliteError);
    await assert.rejects(store.save({ sessionId: "s", revision: 0, messages: [] }), Database.SqliteError);
    store.close();
    await assert.rejects(store.load("s"), /not open/);
    await assert.rejects(store.save({ sessionId: "s", revision: 0, messages: [] }), /not open/);
  } finally { raw.close(); store.close(); f.cleanup(); }
});

test("SQLite cannot-open IO error and corrupt file error are not conflicts", () => {
  const f = fixture();
  try {
    assert.throws(() => new SQLiteSessionStore(join(f.directory, "missing", "sessions.sqlite")), (e: unknown) => e instanceof Error && !(e instanceof SessionConflictError));
    writeFileSync(f.filename, "this is not a sqlite database");
    assert.throws(() => new SQLiteSessionStore(f.filename), (e: unknown) => e instanceof Database.SqliteError && e.code === "SQLITE_NOTADB");
  } finally { f.cleanup(); }
});
