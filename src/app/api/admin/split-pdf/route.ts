import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

// 합쳐진 PDF를 받아서 페이지 수만 반환 (클라이언트에서 미리보기용)
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(buffer)
  const pageCount = pdfDoc.getPageCount()

  return NextResponse.json({ pageCount })
}
