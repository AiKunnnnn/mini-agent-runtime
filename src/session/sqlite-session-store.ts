import Database from "better-sqlite3";
import {
  nextRevision, SessionConflictError, validateSessionId, validateSessionSnapshot,
  type SessionSnapshot, type SessionStore,
} from "./session-store.ts";

export class SQLiteSessionStore implements SessionStore {
  readonly #db: Database.Database;

  /** Opens (or creates) a database. Caller owns close(), including on failure. */
  constructor(filename: string) {
    this.#db = new Database(filename);
    try {
      this.#db.exec(`CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY NOT NULL,
        revision INTEGER NOT NULL CHECK (typeof(revision) = 'integer' AND revision BETWEEN 1 AND 9007199254740991),
        messages TEXT NOT NULL
      )`);
    } catch (error) {
      this.#db.close();
      throw error;
    }
  }

  close(): void {
    this.#db.close();
  }

  async load(sessionId: string): Promise<SessionSnapshot | null> {
    validateSessionId(sessionId);
    // BigInt prevents unsafe SQLite integers from rounding into valid JS revisions.
    const row = this.#db.prepare("SELECT revision, messages FROM sessions WHERE session_id = ?")
      .safeIntegers().get(sessionId) as { revision: unknown; messages: unknown } | undefined;
    if (row === undefined) return null;
    if (typeof row.revision !== "bigint" || row.revision < 1n || row.revision > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError("Invalid persisted session revision.");
    }
    if (typeof row.messages !== "string") throw new TypeError("Persisted messages must be JSON text.");
    const snapshot: unknown = {
      sessionId, revision: Number(row.revision), messages: JSON.parse(row.messages) as unknown,
    };
    validateSessionSnapshot(snapshot);
    return snapshot;
  }

  async save(snapshot: SessionSnapshot): Promise<SessionSnapshot> {
    validateSessionSnapshot(snapshot);
    const revision = nextRevision(snapshot.revision);
    const messages = JSON.stringify(snapshot.messages);
    // Each statement is its own atomic SQLite transaction. No read-then-write gap.
    const row = snapshot.revision === 0
      ? this.#db.prepare(`INSERT INTO sessions (session_id, revision, messages) VALUES (?, 1, ?)
          ON CONFLICT(session_id) DO NOTHING RETURNING revision`).get(snapshot.sessionId, messages)
      : this.#db.prepare(`UPDATE sessions SET revision = revision + 1, messages = ?
          WHERE session_id = ? AND revision = ? RETURNING revision`)
        .get(messages, snapshot.sessionId, snapshot.revision);
    if (row === undefined) throw new SessionConflictError(snapshot.sessionId, snapshot.revision);
    // RETURNING is the committed statement's actual revision, not a subsequent SELECT.
    const actual = (row as { revision: unknown }).revision;
    if (actual !== revision) throw new Error("SQLite returned an unexpected session revision.");
    return { sessionId: snapshot.sessionId, revision: actual, messages: JSON.parse(messages) as SessionSnapshot["messages"] };
  }
}
