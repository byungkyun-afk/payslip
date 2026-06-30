import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import pool from '@/lib/db'
import { extractText, getDocumentProxy } from 'unpdf'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const srcPdf = await PDFDocument.load(buffer)
  const pageCount = srcPdf.getPageCount()

  const { rows: employees } = await pool.query(
    'SELECT id, name FROM employees WHERE is_active=true'
  )

  const suggestions: { pageIndex: number; employeeId: string | null; employeeName: string | null }[] = []

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text: pageTexts } = await extractText(pdf, { mergePages: false })

    for (let i = 0; i < pageCount; i++) {
      const text = pageTexts[i] ?? ''
      const matched = employees.find((emp: { name: string }) => text.includes(emp.name))
      suggestions.push({
        pageIndex: i,
        employeeId: matched?.id ?? null,
        employeeName: matched?.name ?? null,
      })
    }
  } catch {
    for (let i = 0; i < pageCount; i++) {
      suggestions.push({ pageIndex: i, employeeId: null, employeeName: null })
    }
  }

  return NextResponse.json({ pageCount, suggestions })
}
