import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase'
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

  // 직원 목록 조회
  const supabase = createServiceClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('is_active', true)

  // 각 페이지 텍스트 추출 → 직원 이름 매칭
  const suggestions: { pageIndex: number; employeeId: string | null; employeeName: string | null }[] = []

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text: pageTexts } = await extractText(pdf, { mergePages: false })

    for (let i = 0; i < pageCount; i++) {
      const text = pageTexts[i] ?? ''
      const matched = employees?.find(emp => text.includes(emp.name))
      suggestions.push({
        pageIndex: i,
        employeeId: matched?.id ?? null,
        employeeName: matched?.name ?? null,
      })
    }
  } catch {
    // 텍스트 추출 실패 시 빈 suggestions 반환 (수동 선택)
    for (let i = 0; i < pageCount; i++) {
      suggestions.push({ pageIndex: i, employeeId: null, employeeName: null })
    }
  }

  return NextResponse.json({ pageCount, suggestions })
}
