import { validateConversation } from "../messages/validate-conversation.ts";
import type { AgentRuntime, RunOptions, RunOutcome } from "../runtime/agent-runtime.ts";
import type { SessionSnapshot, SessionStore } from "../session/session-store.ts";

type PersistenceSettlement = PromiseSettledResult<SessionSnapshot> | { status: "skipped" };

/** Demo-only application orchestration. Caller must await this before the next run.
 * reusable means this application workflow may safely proceed to another Run and Save.
 * Invalid history or a save failure requires explicit caller handling before continuing.
 * This helper does not recover, reload, roll back facts or replay tools.
 * Save failures never change the run settlement and are never retried here.
 */
export async function runAndSave(
  runtime: AgentRuntime,
  store: SessionStore,
  sessionId: string,
  revision: number,
  input: string,
  options: RunOptions = {},
): Promise<{
  run: PromiseSettledResult<RunOutcome>;
  persistence: PersistenceSettlement;
  reusable: boolean;
}> {
  const before = runtime.getMessages();
  // Refuse to reuse a runtime left with invalid facts by an earlier failed run.
  validateConversation(before);
  let run: PromiseSettledResult<RunOutcome>;
  try {
    run = { status: "fulfilled", value: await runtime.run(input, options) };
  } catch (reason) {
    run = { status: "rejected", reason };
  }
  const messages = runtime.getMessages();
  try {
    validateConversation(messages);
  } catch (reason) {
    return { run, persistence: { status: "rejected", reason }, reusable: false };
  }
  if (messages.length === before.length) {
    return { run, persistence: { status: "skipped" }, reusable: true };
  }
  let persistence: PersistenceSettlement;
  try {
    persistence = { status: "fulfilled", value: await store.save({ sessionId, revision, messages }) };
  } catch (reason) {
    persistence = { status: "rejected", reason };
  }
  return { run, persistence, reusable: persistence.status === "fulfilled" };
}
