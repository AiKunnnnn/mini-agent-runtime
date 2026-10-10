import {
  nextRevision,
  SessionConflictError,
  validateSessionId,
  validateSessionSnapshot,
  type SessionSnapshot,
  type SessionStore,
} from './session-store.ts'

export class MemorySessionStore implements SessionStore {
  readonly #sessions = new Map<string, SessionSnapshot>()

  async load(sessionId: string): Promise<SessionSnapshot | null> {
    validateSessionId(sessionId)
    const snapshot = this.#sessions.get(sessionId)
    return snapshot === undefined ? null : structuredClone(snapshot)
  }

  async save(snapshot: SessionSnapshot): Promise<SessionSnapshot> {
    validateSessionSnapshot(snapshot)
    const revision = nextRevision(snapshot.revision)
    const saved: SessionSnapshot = {
      sessionId: snapshot.sessionId,
      revision,
      messages: structuredClone(snapshot.messages),
    }
    // No await between checking the current revision and replacing the snapshot.
    const current = this.#sessions.get(snapshot.sessionId)
    if ((current?.revision ?? 0) !== snapshot.revision) {
      throw new SessionConflictError(snapshot.sessionId, snapshot.revision)
    }
    this.#sessions.set(snapshot.sessionId, saved)
    return structuredClone(saved)
  }
}
