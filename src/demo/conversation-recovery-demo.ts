import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AgentRuntime } from '../runtime/agent-runtime.ts'
import { SQLiteSessionStore } from '../session/sqlite-session-store.ts'
import { runAndSave } from './conversation-workflow.ts'

const directory = await mkdtemp(join(tmpdir(), 'conversation-recovery-'))
const filename = join(directory, 'sessions.sqlite')
const sessionId = randomUUID()
let store = new SQLiteSessionStore(filename)
try {
  // New conversation explicitly starts empty with expected revision 0.
  const first = await runAndSave(
    new AgentRuntime({
      async generate() {
        return {
          message: { role: 'assistant', content: '你好，小明。' },
          finishReason: 'stop',
        }
      },
    }),
    store,
    sessionId,
    0,
    '我叫小明',
  )
  assert.equal(first.run.status, 'fulfilled')
  assert.equal(first.persistence.status, 'fulfilled')
  console.log('Run #1:', first)
  // The old runtime is no longer used. Reopen the same file through a new connection.
  store.close()
  store = new SQLiteSessionStore(filename)
  const saved = await store.load(sessionId)
  if (saved === null)
    throw new Error(`Recovery requires an existing session: ${sessionId}`)
  const second = await runAndSave(
    new AgentRuntime(
      {
        async generate(request) {
          assert.deepEqual(request.messages.slice(0, 2), [
            { role: 'user', content: '我叫小明' },
            { role: 'assistant', content: '你好，小明。' },
          ])
          console.log('Recovered model request:', request)
          return {
            message: { role: 'assistant', content: '你叫小明。' },
            finishReason: 'stop',
          }
        },
      },
      { initialMessages: saved.messages },
    ),
    store,
    sessionId,
    saved.revision,
    '我叫什么名字？',
  )
  assert.equal(second.run.status, 'fulfilled')
  assert.equal(second.persistence.status, 'fulfilled')
  if (second.persistence.status === 'fulfilled')
    assert.equal(second.persistence.value.revision, 2)
  console.log('Run #2:', second)
} finally {
  store.close()
  await rm(directory, { recursive: true, force: true })
}
