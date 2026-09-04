import type { RuntimeMessage } from "../messages/runtime-message.ts";

export interface RuntimeState {
  messages: RuntimeMessage[];
}
