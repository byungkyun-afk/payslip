import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const srcPdf = await PDFDocument.load(buffer)
  const pageCount = srcPdf.getPageCount()

  // 직원 목록 조회
  const supabase = createServiceClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('is_active', true)

  // 각 페이지 텍스트 추출 후 이름 매칭
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')

  const suggestions: { pageIndex: number; employeeId: string | null; employeeName: string | null }[] = []

  for (let i = 0; i < pageCount; i++) {
    try {
      const newPdf = await PDFDocument.create()
      const [page] = await newPdf.copyPages(srcPdf, [i])
      newPdf.addPage(page)
      const pdfBytes = await newPdf.save()

      const parsed = await pdfParse(Buffer.from(pdfBytes))
      const text: string = parsed.text

      const matched = employees?.find(emp => text.includes(emp.name))
      suggestions.push({
        pageIndex: i,
        employeeId: matched?.id ?? null,
        employeeName: matched?.name ?? null,
      })
    } catch {
      suggestions.push({ pageIndex: i, employeeId: null, employeeName: null })
    }
  }

  return NextResponse.json({ pageCount, suggestions })
}
