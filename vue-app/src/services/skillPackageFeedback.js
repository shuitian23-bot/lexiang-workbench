const VERSION = 1
const PREFIX = 'leaibot:skill-package-feedback:v1:'

function identityKey(account, skillKey) {
  if (typeof account !== 'string' || !account.trim() || typeof skillKey !== 'string' || !skillKey.trim()) return null
  return `${PREFIX}${encodeURIComponent(account.trim())}:${encodeURIComponent(skillKey.trim())}`
}

function parseChoice(raw) {
  if (raw === null) return null
  try {
    const record = JSON.parse(raw)
    return record && record.version === VERSION && (record.value === 'up' || record.value === 'down')
      ? record.value
      : null
  } catch {
    return null
  }
}

export function createSkillPackageFeedbackStore(storageProvider = () => globalThis.localStorage) {
  function current(key) {
    try {
      const storage = storageProvider()
      if (!storage) return { ok: false, value: null }
      return { ok: true, value: parseChoice(storage.getItem(key)), storage }
    } catch {
      return { ok: false, value: null }
    }
  }

  return {
    read(account, skillKey) {
      const key = identityKey(account, skillKey)
      return key ? current(key).value : null
    },
    toggle(account, skillKey, value) {
      const key = identityKey(account, skillKey)
      if (!key || (value !== 'up' && value !== 'down')) return { ok: false, value: null }
      const previous = current(key)
      if (!previous.ok) return { ok: false, value: previous.value }
      const next = previous.value === value ? null : value
      try {
        if (next === null) previous.storage.removeItem(key)
        else previous.storage.setItem(key, JSON.stringify({ version: VERSION, value: next }))
        return { ok: true, value: next }
      } catch {
        return { ok: false, value: previous.value }
      }
    },
  }
}
