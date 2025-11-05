export function downloadCSV(data: Record<string, any>[], filename: string = 'data.csv') {
  const headers = Object.keys(data[0])

  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((field) => {
          let value = row[field] ?? ''
          value = String(value).replace(/"/g, '""') // Escape double quotes
          return /[",\n]/.test(value) ? `"${value}"` : value // Wrap values containing commas or newlines in quotes
        })
        .join(',')
    ),
  ]

  const csvString = csvRows.join('\n')

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
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
