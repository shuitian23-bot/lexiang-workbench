import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  createMessageTimestampResolver,
  formatMessageTimestamp
} from '../src/utils/messageTimestamp.js'

test('formats local message time with zero-padded seconds', () => {
  assert.equal(
    formatMessageTimestamp(new Date(2026, 7, 14, 9, 5, 7)),
    '2026-08-14 09:05:07'
  )
})

test('returns an empty string for an invalid timestamp', () => {
  assert.equal(formatMessageTimestamp('not-a-date'), '')
})

test('keeps a stable fallback for a legacy message without at', () => {
  const values = [
    new Date(2026, 7, 14, 10, 0, 1),
    new Date(2026, 7, 14, 10, 0, 9)
  ]
  const expectedDatetime = values[0].toISOString()
  const resolve = createMessageTimestampResolver(() => values.shift())
  const message = { role: 'assistant', text: '旧消息' }

  assert.deepEqual(resolve(message), {
    datetime: expectedDatetime,
    label: '2026-08-14 10:00:01'
  })
  assert.deepEqual(resolve(message), {
    datetime: expectedDatetime,
    label: '2026-08-14 10:00:01'
  })
})

test('message list renders timestamps for welcome and stored messages', async () => {
  const source = await readFile(new URL('../src/components/agent/AgentMessageList.vue', import.meta.url), 'utf8')
  assert.match(source, /class="time ai-message-time ai-welcome-time"/)
  assert.match(source, /class="time ai-message-time"/)
  assert.match(source, /:datetime="messageTime\(msg\)\.datetime"/)
})

test('timestamps stay attached beneath their message bubbles without wrapping', async () => {
  const source = await readFile(new URL('../src/components/agent/AgentMessageList.vue', import.meta.url), 'utf8')
  assert.match(source, /<div class="bubble ai-message-bubble">[\s\S]*?<time class="time ai-message-time ai-welcome-time"/)
  assert.match(source, /<div class="bubble ai-message-bubble">[\s\S]*?<time class="time ai-message-time"/)
  assert.match(source, /\.ai-message-bubble\s*\{[\s\S]*?position:\s*relative/)
  assert.match(source, /\.ai-message-time\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*100%;[\s\S]*?white-space:\s*nowrap/)
  assert.match(source, /\.ai-msg\.user \.ai-message-time\s*\{[\s\S]*?right:\s*0/)
  assert.match(source, /\.ai-msg\.assistant \.ai-message-time\s*\{[\s\S]*?left:\s*0/)
})
