type CsvCell = string | number | null | undefined

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function reviewDateRangeError(startDate: string, endDate: string): string {
  if ((startDate && !isDate(startDate)) || (endDate && !isDate(endDate))) {
    return '请输入有效的开始日期和结束日期。'
  }
  if (startDate && endDate && startDate > endDate) {
    return '开始日期不能晚于结束日期。'
  }
  return ''
}

export function matchesReviewDateRange(value: string, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true
  const date = value.slice(0, 10)
  if (!isDate(date) || reviewDateRangeError(startDate, endDate)) return false
  return (!startDate || date >= startDate) && (!endDate || date <= endDate)
}

export function reviewPageRecords<T>(records: readonly T[], page: number, pageSize: number): T[] {
  return records.slice((page - 1) * pageSize, page * pageSize)
}

export function createReviewCsv(rows: readonly (readonly CsvCell[])[]): string {
  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? '')
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  return `\uFEFF${csv}`
}

export function downloadReviewCsv(filename: string, rows: readonly (readonly CsvCell[])[]): void {
  const url = URL.createObjectURL(new Blob([createReviewCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
