import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

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
