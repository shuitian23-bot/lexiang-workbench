import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

import { recordPortalRelease } from './portal-release-ledger.mjs'

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function releaseInput(overrides = {}) {
  return {
    environment: 'new',
    recordKey: 'portal-release-ledger',
    title: '调整日志双环境发布记录',
    publisher: 'zhangrui',
    releasedAt: '2026-08-26 11:30:00',
    version: 'abc123def456',
    ...overrides
  }
}

test('records a preview release and mirrors the same ledger to both sites', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portal-release-ledger-'))
  const ledgerPath = path.join(root, 'ledger.json')
  const previewOutput = path.join(root, 'new', 'poc-release-ledger.json')
  const formalOutput = path.join(root, 'formal', 'poc-release-ledger.json')

  await recordPortalRelease({
    ...releaseInput(),
    ledgerPath,
    outputPaths: [previewOutput, formalOutput]
  })

  const ledger = await readJson(ledgerPath)
  assert.deepEqual(ledger.records['portal-release-ledger'].releases.new, {
    publisher: 'zhangrui',
    releasedAt: '2026-08-26 11:30:00',
    version: 'abc123def456'
  })
  assert.equal(ledger.records['portal-release-ledger'].releases.formal, undefined)
  assert.deepEqual(await readJson(previewOutput), ledger)
  assert.deepEqual(await readJson(formalOutput), ledger)
})

test('adds formal attribution without losing the preview publisher', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portal-release-ledger-'))
  const ledgerPath = path.join(root, 'ledger.json')

  await recordPortalRelease({
    ...releaseInput(),
    ledgerPath,
    outputPaths: []
  })
  await recordPortalRelease({
    ...releaseInput({
      environment: 'formal',
      publisher: 'baiyu',
      releasedAt: '2026-08-26 12:10:00',
      version: 'fed654cba321'
    }),
    ledgerPath,
    outputPaths: []
  })

  const releases = (await readJson(ledgerPath)).records['portal-release-ledger'].releases
  assert.equal(releases.new.publisher, 'zhangrui')
  assert.equal(releases.formal.publisher, 'baiyu')
  assert.equal(releases.formal.version, 'fed654cba321')
})

test('updates only the selected environment when the same release is recorded again', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portal-release-ledger-'))
  const ledgerPath = path.join(root, 'ledger.json')

  await recordPortalRelease({ ...releaseInput(), ledgerPath, outputPaths: [] })
  await recordPortalRelease({
    ...releaseInput({ publisher: 'guanfeng2', version: '222222222222' }),
    ledgerPath,
    outputPaths: []
  })

  const record = (await readJson(ledgerPath)).records['portal-release-ledger']
  assert.equal(record.title, '调整日志双环境发布记录')
  assert.equal(record.releases.new.publisher, 'guanfeng2')
  assert.equal(record.releases.new.version, '222222222222')
})

test('serializes concurrent preview and formal writers without dropping either release', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portal-release-ledger-'))
  const ledgerPath = path.join(root, 'ledger.json')

  await Promise.all([
    recordPortalRelease({ ...releaseInput(), ledgerPath, outputPaths: [] }),
    recordPortalRelease({
      ...releaseInput({
        environment: 'formal',
        publisher: 'baiyu',
        releasedAt: '2026-08-26 12:10:00',
        version: 'fed654cba321'
      }),
      ledgerPath,
      outputPaths: []
    })
  ])

  const releases = (await readJson(ledgerPath)).records['portal-release-ledger'].releases
  assert.equal(releases.new.publisher, 'zhangrui')
  assert.equal(releases.formal.publisher, 'baiyu')
})

test('rejects unsupported environments before writing a ledger', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portal-release-ledger-'))

  await assert.rejects(
    recordPortalRelease({
      ...releaseInput({ environment: 'staging' }),
      ledgerPath: path.join(root, 'ledger.json'),
      outputPaths: []
    }),
    /environment must be new or formal/
  )
})

async function reviewedLedger(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'portal-release-ledger-cas-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const ledgerPath = path.join(root, 'ledger.json')
  const outputPaths = [path.join(root, 'new.json'), path.join(root, 'formal.json')]
  const ledger = {
    schemaVersion: 1,
    updatedAt: '2026-08-26 11:30:00',
    records: {
      'portal-release-ledger': {
        title: '调整日志双环境发布记录',
        releases: {
          new: {
            publisher: 'zhangrui',
            releasedAt: '2026-08-26 11:30:00',
            version: 'abc123def456'
          }
        }
      }
    }
  }
  // Deliberate whitespace and Chinese text distinguish raw UTF-8 bytes from canonical JSON.
  const reviewedBytes = Buffer.from(`\n${JSON.stringify(ledger, null, 4)}\n\n`, 'utf8')
  await Promise.all([ledgerPath, ...outputPaths].map(file => writeFile(file, reviewedBytes)))
  const expectedLedgerSha256 = createHash('sha256').update(reviewedBytes).digest('hex')
  return { ledgerPath, outputPaths, expectedLedgerSha256, ledger, reviewedBytes }
}

async function ledgerBytes(ledgerPath, outputPaths) {
  return Promise.all([ledgerPath, ...outputPaths].map(file => readFile(file)))
}

test('accepts the SHA-256 of the reviewed raw UTF-8 ledger and mirrors the formal release', async t => {
  const fixture = await reviewedLedger(t)
  const { ledgerPath, outputPaths, expectedLedgerSha256 } = fixture
  await recordPortalRelease({
    ...releaseInput({ environment: 'formal', publisher: 'baiyu', version: 'fed654cba321' }),
    ledgerPath,
    outputPaths,
    expectedLedgerSha256
  })

  const ledger = await readJson(ledgerPath)
  assert.deepEqual(ledger.records['portal-release-ledger'].releases.new,
    fixture.ledger.records['portal-release-ledger'].releases.new)
  assert.deepEqual(ledger.records['portal-release-ledger'].releases.formal, {
    publisher: 'baiyu',
    releasedAt: '2026-08-26 11:30:00',
    version: 'fed654cba321'
  })
  for (const output of outputPaths) assert.deepEqual(await readJson(output), ledger)
  await assert.rejects(readFile(`${ledgerPath}.lock`), { code: 'ENOENT' })
})

test('rejects a stale ledger digest without replacing another publisher or either site output', async t => {
  const { ledgerPath, outputPaths, expectedLedgerSha256 } = await reviewedLedger(t)
  await recordPortalRelease({
    ...releaseInput({ environment: 'formal', publisher: 'baiyu', version: 'other-release' }),
    ledgerPath,
    outputPaths
  })
  const before = await ledgerBytes(ledgerPath, outputPaths)

  await assert.rejects(recordPortalRelease({
    ...releaseInput({ environment: 'formal', version: 'stale-release' }),
    ledgerPath,
    outputPaths,
    expectedLedgerSha256
  }), /ledger.*(?:changed|mismatch)|(?:changed|mismatch).*ledger/i)

  assert.deepEqual(await ledgerBytes(ledgerPath, outputPaths), before)
  await assert.rejects(readFile(`${ledgerPath}.lock`), { code: 'ENOENT' })
})

test('rejects malformed expected ledger digests without changing any release files', async t => {
  for (const expectedLedgerSha256 of ['', 'not-a-digest', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), 'A'.repeat(64), 42, null]) {
    await t.test(JSON.stringify(expectedLedgerSha256), async t => {
      const { ledgerPath, outputPaths } = await reviewedLedger(t)
      const before = await ledgerBytes(ledgerPath, outputPaths)
      await assert.rejects(recordPortalRelease({
        ...releaseInput({ environment: 'formal' }),
        ledgerPath,
        outputPaths,
        expectedLedgerSha256
      }), /expectedLedgerSha256/)
      assert.deepEqual(await ledgerBytes(ledgerPath, outputPaths), before)
      await assert.rejects(readFile(`${ledgerPath}.lock`), { code: 'ENOENT' })
    })
  }
})

test('compares the reviewed digest after acquiring the lock when another publisher changes the ledger', async t => {
  const fixture = await reviewedLedger(t)
  const { ledgerPath, outputPaths, expectedLedgerSha256 } = fixture
  const lockPath = `${ledgerPath}.lock`
  await writeFile(lockPath, 'other-publisher\n', { flag: 'wx' })
  const attempted = recordPortalRelease({
    ...releaseInput({ environment: 'formal', version: 'stale-release' }),
    ledgerPath,
    outputPaths,
    expectedLedgerSha256
  }).then(value => ({ value }), error => ({ error }))

  try {
    assert.equal(await Promise.race([attempted, delay(150).then(() => 'waiting')]), 'waiting')
    fixture.ledger.records['portal-release-ledger'].releases.formal = {
      publisher: 'baiyu', releasedAt: '2026-08-26 12:10:00', version: 'other-release'
    }
    const otherBytes = Buffer.from(`${JSON.stringify(fixture.ledger, null, 2)}\n`, 'utf8')
    // The existing lock belongs to this simulated publisher until all three writes complete.
    await Promise.all([ledgerPath, ...outputPaths].map(file => writeFile(file, otherBytes)))
    await unlink(lockPath)

    const result = await attempted
    assert.ok(result.error instanceof Error, 'a writer using the stale reviewed digest must reject')
    assert.match(result.error.message, /ledger.*(?:changed|mismatch)|(?:changed|mismatch).*ledger/i)
    assert.deepEqual(await ledgerBytes(ledgerPath, outputPaths), [otherBytes, otherBytes, otherBytes])
    await assert.rejects(readFile(lockPath), { code: 'ENOENT' })
  } finally {
    await unlink(lockPath).catch(() => {})
    await attempted
  }
})

test('does not recreate a missing ledger when an expected digest was supplied', async t => {
  const { ledgerPath, outputPaths, expectedLedgerSha256 } = await reviewedLedger(t)
  const beforeOutputs = await Promise.all(outputPaths.map(file => readFile(file)))
  await unlink(ledgerPath)

  await assert.rejects(recordPortalRelease({
    ...releaseInput({ environment: 'formal' }),
    ledgerPath,
    outputPaths,
    expectedLedgerSha256
  }), /ledger/i)

  await assert.rejects(readFile(ledgerPath), { code: 'ENOENT' })
  assert.deepEqual(await Promise.all(outputPaths.map(file => readFile(file))), beforeOutputs)
  await assert.rejects(readFile(`${ledgerPath}.lock`), { code: 'ENOENT' })
})
