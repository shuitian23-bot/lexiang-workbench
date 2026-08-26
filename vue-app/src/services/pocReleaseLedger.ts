export interface PocReleaseEvidence {
  publisher: string
  releasedAt: string
  version: string
}

export interface PocReleaseLedgerRecord {
  title: string
  releases: Partial<Record<'new' | 'formal', PocReleaseEvidence>>
}

export interface PocReleaseLedger {
  schemaVersion: number
  updatedAt: string
  records: Record<string, PocReleaseLedgerRecord>
}

const EMPTY_LEDGER: PocReleaseLedger = {
  schemaVersion: 1,
  updatedAt: '',
  records: {}
}

export async function loadPocReleaseLedger(): Promise<PocReleaseLedger> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}poc-release-ledger.json`, {
      cache: 'no-store'
    })
    if (!response.ok) return EMPTY_LEDGER

    const ledger = await response.json()
    if (!ledger || typeof ledger !== 'object' || !ledger.records || typeof ledger.records !== 'object') {
      return EMPTY_LEDGER
    }
    return ledger as PocReleaseLedger
  } catch {
    return EMPTY_LEDGER
  }
}
