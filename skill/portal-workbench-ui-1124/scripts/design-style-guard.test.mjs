import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { styleViolations, compareViolations, gitBaseline } from './design-style-guard.mjs'

test('unrelated edits preserve existing finalized styles; new violations still fail', () => {
  const before = '<style>.old { color: #123456; gap: 7px; }</style>'
  const after = '<template><p>new copy</p></template>' + before
  assert.ok(compareViolations(styleViolations(after, true), styleViolations(before, true)).every(x => x.inherited))
  const changed = after.replace('gap: 7px', 'gap: 9px')
  const result = compareViolations(styleViolations(changed, true), styleViolations(before, true))
  assert.equal(result.filter(x => !x.inherited).length, 1)
})

test('copying an existing violation to a new selector or duplicating it is new debt', () => {
  const old = styleViolations('.a { gap: 7px; }')
  assert.equal(compareViolations(styleViolations('.b { gap: 7px; }'), old)[0].inherited, false)
  assert.equal(compareViolations(styleViolations('.a { gap: 7px; gap: 7px; }'), old).filter(x => !x.inherited).length, 1)
})

test('approved geometry uses named tokens without changing 19/3/6px dimensions', () => {
  assert.deepEqual(styleViolations('.title { font-size: var(--page-header-title-size, 19px); margin-top: var(--page-header-description-gap, 3px); border-radius: var(--page-header-marker-radius, 6px); }'), [])
  assert.ok(styleViolations('.body { font-size: 19px; }').length)
  assert.deepEqual(styleViolations('.title { font: 700 var(--page-header-title-size)/22px sans-serif; }'), [])
})

test('mixed literals, shorthand colors, logical spacing and font shorthand cannot hide behind tokens', () => {
  for (const css of ['gap: var(--space-2) 7px', 'padding-inline: 7px', 'border: 1px solid #123456', 'background-image: linear-gradient(#fff, #000)', 'font: 700 17px/1.5 sans-serif']) {
    assert.ok(styleViolations(`.a { ${css}; }`).length, css)
  }
})

test('comments and quoted text are not CSS violations; zero radius and percentages remain valid', () => {
  assert.deepEqual(styleViolations('.a { /* color: #fff; */ content: "color: #123456; { }"; border-radius: 0px; width: 50%; }'), [])
})

test('multiline declarations and missing final semicolons are inspected', () => {
  assert.equal(styleViolations('.a { color:\n #123456\n}').length, 1)
  assert.equal(styleViolations('<template>color: #fff</template><style scoped>\n.a { gap: 7px }</style>', true)[0].line, 2)
})

test('Git baseline is pinned to a real commit and reads committed content, not working changes', t => {
  const root = mkdtempSync(join(tmpdir(), 'portal-guard-baseline-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git(['init', '-q'])
  writeFileSync(join(root, 'old.css'), '.a { gap: 7px; }')
  git(['add', 'old.css'])
  git(['-c', 'user.name=Guard Test', '-c', 'user.email=guard@example.invalid', 'commit', '-qm', 'baseline'])
  const baseline = gitBaseline(root, 'HEAD')
  writeFileSync(join(root, 'old.css'), '.a { gap: 9px; }')
  writeFileSync(join(root, 'new file.css'), '.b { gap: 7px; }')
  assert.equal(baseline(join(root, 'old.css')), '.a { gap: 7px; }')
  assert.equal(baseline(join(root, 'new file.css')), '')
  assert.throws(() => gitBaseline(root, 'missing-ref'))
  symlinkSync(join(root, 'old.css'), join(root, 'link.css'))
  assert.throws(() => baseline(join(root, 'link.css')))
})

test('invalid CLI input cannot silently skip the intended audit', () => {
  const checker = new URL('./check-consistency.mjs', import.meta.url)
  for (const args of [['--changed-fiel', 'x.vue'], ['--changed-file'], ['--baseline-ref', 'HEAD'], ['--guard-all', '--changed-file', 'x.vue']]) {
    const result = spawnSync(process.execPath, [checker.pathname, ...args], { encoding: 'utf8' })
    assert.notEqual(result.status, 0, args.join(' '))
  }
})
