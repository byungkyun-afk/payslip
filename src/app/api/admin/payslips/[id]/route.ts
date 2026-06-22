import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: payslip } = await supabase
    .from('payslips')
    .select('pdf_url, cloudinary_id')
    .eq('id', id)
    .single()

  if (!payslip) {
    return NextResponse.json({ error: '명세서 없음' }, { status: 404 })
  }

  const pdfUrl = payslip.pdf_url ?? payslip.cloudinary_id

  // 서버에서 Cloudinary PDF를 가져와서 브라우저로 중계
  const res = await fetch(pdfUrl)
  if (!res.ok) {
    return NextResponse.json({ error: `PDF 불러오기 실패: ${res.status}` }, { status: 502 })
  }

  const pdfBuffer = await res.arrayBuffer()
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
    },
  })
}
