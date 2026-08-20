function pad(value) {
  return String(value).padStart(2, '0')
}

function toValidDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatMessageTimestamp(value) {
  const date = toValidDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function createMessageTimestampResolver(now = () => new Date()) {
  const fallbacks = new WeakMap()

  return (message) => {
    let date = toValidDate(message?.at)
    if (!date) {
      if (!fallbacks.has(message)) fallbacks.set(message, now().toISOString())
      date = toValidDate(fallbacks.get(message))
    }

    return {
      datetime: date.toISOString(),
      label: formatMessageTimestamp(date)
    }
  }
}
