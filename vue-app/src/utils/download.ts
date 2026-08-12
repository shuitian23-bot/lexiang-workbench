export interface DownloadTextFileOptions {
  content: BlobPart
  fileName: string
  mimeType: string
}

export function downloadTextFile({ content, fileName, mimeType }: DownloadTextFileOptions) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
