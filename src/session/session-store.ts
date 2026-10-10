import type { RuntimeMessage } from "../messages/runtime-message.ts";
import { validateConversation } from "../messages/validate-conversation.ts";

export interface SessionSnapshot {
  sessionId: string;
  /** Expected revision on save; committed revision on load/save return. */
  revision: number;
  messages: RuntimeMessage[];
}

export interface SessionStore {
  load(sessionId: string): Promise<SessionSnapshot | null>;
  save(snapshot: SessionSnapshot): Promise<SessionSnapshot>;
}

export class SessionConflictError extends Error {
  constructor(readonly sessionId: string, readonly expectedRevision: number) {
    super(`Session ${sessionId} conflicts with expected revision ${expectedRevision}.`);
    this.name = "SessionConflictError";
  }
}

export function validateSessionId(sessionId: unknown): asserts sessionId is string {
  if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
    throw new TypeError("sessionId must be a non-empty string.");
  }
}

export function validateSessionSnapshot(snapshot: unknown): asserts snapshot is SessionSnapshot {
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("SessionSnapshot must be an object.");
  }
  const value = snapshot as Record<string, unknown>;
  validateSessionId(value.sessionId);
  if (typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0) {
    throw new RangeError("revision must be a non-negative safe integer.");
  }
  validateConversation(value.messages);
}

export function nextRevision(revision: number): number {
  if (revision === Number.MAX_SAFE_INTEGER) throw new RangeError("Session revision exhausted the safe integer range.");
  return revision + 1;
}
