import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { cloudinary } from '@/lib/cloudinary'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: payslip } = await supabase
    .from('payslips')
    .select('cloudinary_id')
    .eq('id', id)
    .single()

  if (!payslip?.cloudinary_id) {
    return NextResponse.json({ error: '명세서 없음' }, { status: 404 })
  }

  // private_download_url로 Cloudinary에서 PDF 가져오기
  const signedUrl = cloudinary.utils.private_download_url(
    payslip.cloudinary_id,
    'pdf',
    { resource_type: 'raw' }
  )

  const res = await fetch(signedUrl)
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
