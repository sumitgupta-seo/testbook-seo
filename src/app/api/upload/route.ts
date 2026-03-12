import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file || !type) {
      return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const text = await file.text()

    let rows: Record<string, string>[] = []

    if (ext === 'csv') {
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      })
      rows = result.data
    } else if (ext === 'xlsx' || ext === 'xls') {
      // Dynamic import for server-side XLSX
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
      // Normalize headers
      rows = rows.map(r => {
        const out: Record<string, string> = {}
        Object.keys(r).forEach(k => { out[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(r[k]) })
        return out
      })
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use CSV, XLSX, or XLS.' }, { status: 400 })
    }

    return NextResponse.json({ rows, count: rows.length, filename: file.name, type })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
