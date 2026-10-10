import type { RuntimeMessage } from './runtime-message.ts'

export class ConversationValidationError extends Error {
  constructor(
    readonly kind: 'structure' | 'protocol',
    detail: string,
  ) {
    super(`Invalid conversation ${kind}: ${detail}`)
    this.name = 'ConversationValidationError'
  }
}

function fail(kind: 'structure' | 'protocol', detail: string): never {
  throw new ConversationValidationError(kind, detail)
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Reject values JSON would silently drop or transform, as well as cycles. */
function validateJSON(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (typeof value !== 'object' || value === null)
    fail('structure', `${path} must be JSON serializable`)
  if (ancestors.has(value)) fail('structure', `${path} contains a cycle`)
  const array = Array.isArray(value)
  const prototype: unknown = Object.getPrototypeOf(value)
  if (array && prototype !== Array.prototype) {
    fail('structure', `${path} must be a plain JSON array`)
  }
  if (!array && prototype !== Object.prototype && prototype !== null) {
    fail('structure', `${path} must be a plain JSON object`)
  }
  ancestors.add(value)
  if (array) {
    for (let i = 0; i < value.length; i++) {
      if (!Object.hasOwn(value, i))
        fail('structure', `${path} contains an array hole`)
    }
  }
  for (const key of Reflect.ownKeys(value)) {
    if (array && key === 'length') continue
    if (typeof key !== 'string')
      fail('structure', `${path} contains a symbol key`)
    if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      fail('structure', `${path} contains a non-JSON array property`)
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      fail('structure', `${path}.${key} must be an enumerable data property`)
    }
    validateJSON(descriptor.value, `${path}.${key}`, ancestors)
  }
  ancestors.delete(value)
}

/** Validates data and complete, contiguous ToolCall batches without interpreting result content. */
export function validateConversation(
  messages: unknown,
): asserts messages is RuntimeMessage[] {
  if (!Array.isArray(messages)) fail('structure', 'messages must be an array')
  validateJSON(messages, 'messages')
  const seen = new Set<string>()
  const pending = new Set<string>()
  for (const [index, message] of messages.entries()) {
    const path = `messages[${index}]`
    if (!record(message)) fail('structure', `${path} must be an object`)
    if (message.type !== 'tool_result' && pending.size > 0) {
      fail('protocol', `${path} interrupts an incomplete ToolCall batch`)
    }
    switch (message.type) {
      case 'user_input':
        if (typeof message.content !== 'string')
          fail('structure', `${path}.content must be a string`)
        break
      case 'model_output':
        if (
          Object.hasOwn(message, 'content') &&
          typeof message.content !== 'string'
        ) {
          fail('structure', `${path}.content must be a string when present`)
        }
        if (Object.hasOwn(message, 'toolCalls')) {
          if (!Array.isArray(message.toolCalls))
            fail('structure', `${path}.toolCalls must be an array`)
          for (const call of message.toolCalls) {
            if (
              !record(call) ||
              typeof call.id !== 'string' ||
              call.id.trim().length === 0 ||
              typeof call.name !== 'string' ||
              call.name.trim().length === 0 ||
              !Object.hasOwn(call, 'arguments')
            ) {
              fail(
                'structure',
                `${path} has an invalid ToolCall (id, name, arguments required)`,
              )
            }
            if (seen.has(call.id))
              fail('protocol', `${path} has duplicate ToolCall ID ${call.id}`)
            seen.add(call.id)
            pending.add(call.id)
          }
        }
        break
      case 'tool_result':
        if (
          typeof message.toolCallId !== 'string' ||
          typeof message.content !== 'string'
        ) {
          fail('structure', `${path} requires string toolCallId and content`)
        }
        if (!pending.delete(message.toolCallId)) {
          fail(
            'protocol',
            `${path} has an orphan, duplicate or wrong-batch ToolResult ${message.toolCallId}`,
          )
        }
        break
      default:
        fail('structure', `${path} has an unknown message type`)
    }
  }
  if (pending.size > 0)
    fail('protocol', `missing ToolResult for ${[...pending].join(', ')}`)
}
