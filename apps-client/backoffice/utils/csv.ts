import { Parser } from '@json2csv/plainjs'

export function downloadCSV(
  headers: string[],
  data: Record<string, any>[],
  filename: string = 'data.csv'
) {
  const parser = new Parser({ fields: headers })
  const csv = parser.parse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
