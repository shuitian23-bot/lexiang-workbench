import { open, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SUPPORTED_ENVIRONMENTS = new Set(['new', 'formal'])

function requiredText(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`)
  }
  return value.trim()
}

async function readLedger(file, expectedSha256) {
  try {
    const contents = await readFile(file)
    if (expectedSha256 && createHash('sha256').update(contents).digest('hex') !== expectedSha256) {
      throw new Error('release ledger changed since review; expected digest does not match')
    }
    const parsed = JSON.parse(contents.toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('ledger root must be an object')
    }
    if (!parsed.records || typeof parsed.records !== 'object' || Array.isArray(parsed.records)) {
      throw new Error('ledger records must be an object')
    }
    return parsed
  } catch (error) {
    if (error?.code === 'ENOENT' && !expectedSha256) {
      return { schemaVersion: 1, updatedAt: '', records: {} }
    }
    throw new Error(`cannot read release ledger: ${error.message}`)
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, file)
}

async function withFileLock(lockPath, task) {
  await mkdir(path.dirname(lockPath), { recursive: true })
  const startedAt = Date.now()
  let handle

  while (!handle) {
    try {
      handle = await open(lockPath, 'wx')
      await handle.writeFile(`${process.pid}\n`, 'utf8')
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      if (Date.now() - startedAt >= 5000) {
        throw new Error('release ledger is busy; retry after the current publisher finishes')
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  try {
    return await task()
  } finally {
    await handle.close()
    await unlink(lockPath).catch(() => {})
  }
}

export async function recordPortalRelease(input) {
  const environment = requiredText(input.environment, 'environment')
  if (!SUPPORTED_ENVIRONMENTS.has(environment)) {
    throw new Error('environment must be new or formal')
  }

  const recordKey = requiredText(input.recordKey, 'recordKey')
  const title = requiredText(input.title, 'title')
  const publisher = requiredText(input.publisher, 'publisher')
  const releasedAt = requiredText(input.releasedAt, 'releasedAt')
  const version = requiredText(input.version, 'version')
  const ledgerPath = requiredText(input.ledgerPath, 'ledgerPath')
  const expectedLedgerSha256 = input.expectedLedgerSha256 === undefined
    ? undefined
    : requiredText(input.expectedLedgerSha256, 'expectedLedgerSha256')
  if (expectedLedgerSha256 !== undefined && !/^[a-f0-9]{64}$/.test(expectedLedgerSha256)) {
    throw new Error('expectedLedgerSha256 must be a lowercase SHA-256 digest')
  }
  const outputPaths = Array.isArray(input.outputPaths)
    ? input.outputPaths.map(file => requiredText(file, 'outputPath'))
    : []

  return withFileLock(`${ledgerPath}.lock`, async () => {
    const ledger = await readLedger(ledgerPath, expectedLedgerSha256)
    const current = ledger.records[recordKey] || { title, releases: {} }
    const releases = current.releases && typeof current.releases === 'object'
      ? current.releases
      : {}

    ledger.schemaVersion = 1
    ledger.updatedAt = releasedAt
    ledger.records[recordKey] = {
      title,
      releases: {
        ...releases,
        [environment]: { publisher, releasedAt, version }
      }
    }

    await writeJsonAtomic(ledgerPath, ledger)
    for (const outputPath of [...new Set(outputPaths)]) {
      await writeJsonAtomic(outputPath, ledger)
    }
    return ledger
  })
}

function parseCliArgs(argv) {
  const command = argv[0]
  const options = { outputPaths: [] }
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag?.startsWith('--') || value === undefined) {
      throw new Error(`invalid argument near ${flag || 'end of command'}`)
    }
    const name = flag.slice(2)
    if (name === 'output') options.outputPaths.push(value)
    else options[name] = value
  }
  return { command, options }
}

async function runCli() {
  const { command, options } = parseCliArgs(process.argv.slice(2))
  if (command !== 'record') throw new Error('command must be record')
  await recordPortalRelease({
    environment: options.environment,
    recordKey: options.key,
    title: options.title,
    publisher: options.publisher,
    releasedAt: options['released-at'],
    version: options.version,
    ledgerPath: options.ledger,
    expectedLedgerSha256: options['expected-ledger-sha256'],
    outputPaths: options.outputPaths
  })
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
