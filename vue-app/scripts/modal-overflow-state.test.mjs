import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

const sourceUrl = new URL('../src/directives/modalOverflowState.ts', import.meta.url)

test('permission modal follows actual overflow, scroll position and content replacement', async () => {
  const code = stripTypeScriptTypes(readFileSync(sourceUrl, 'utf8'))
  const { vModalOverflowState: directive } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const originals = Object.fromEntries(['ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map((key) => [key, globalThis[key]]))
  const frames = new Map()
  const observers = []
  let nextFrame = 0
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this) }
    observe(target) { this.targets.push(target) }
    disconnect() { this.targets = [] }
  }
  globalThis.ResizeObserver = Observer
  globalThis.MutationObserver = Observer
  globalThis.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame }
  globalThis.cancelAnimationFrame = (id) => frames.delete(id)
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()) }
  const classes = new Set()
  const listeners = new Map()
  const modal = {
    scrollHeight: 180, clientHeight: 240, scrollTop: 0, regions: [],
    classList: { toggle: (name, value) => value ? classes.add(name) : classes.delete(name) },
    querySelectorAll() { return this.regions },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name) },
  }
  try {
    directive.mounted(modal, { value: false })
    assert.equal(observers.length, 0, 'shared dialogs outside permission management remain untouched')
    directive.unmounted(modal)
    directive.mounted(modal)
    flush()
    assert.deepEqual([...classes], [], 'short content stays in normal document flow without shadow')
    modal.scrollHeight = 600
    observers[0].callback()
    flush()
    assert.ok(classes.has('modal-content-overflowing'))
    assert.ok(classes.has('modal-content-can-scroll-down'))
    modal.scrollTop = 360
    listeners.get('scroll')()
    flush()
    assert.ok(classes.has('modal-content-overflowing'), 'footer remains reachable at bottom')
    assert.equal(classes.has('modal-content-can-scroll-down'), false, 'shadow disappears at bottom')
    const body = { scrollHeight: 900, clientHeight: 300, scrollTop: 0 }
    modal.regions = [body]
    directive.updated(modal)
    flush()
    assert.deepEqual(observers[0].targets, [body], 'tab changes rebind the real scroll region')
    assert.ok(classes.has('modal-content-can-scroll-down'))
    body.scrollHeight = 200
    observers[1].callback()
    flush()
    assert.deepEqual([...classes], [], 'shrinking content removes sticky and shadow states')
    body.scrollHeight = 301
    directive.updated(modal)
    flush()
    assert.deepEqual([...classes], [], 'one-pixel rounding is not overflow')
    directive.updated(modal)
    directive.unmounted(modal)
    assert.equal(frames.size, 0, 'unmount cancels pending work')
    assert.equal(listeners.size, 0, 'unmount releases scroll listener')
    assert.ok(observers.every((observer) => observer.targets.length === 0), 'unmount disconnects observers')
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
