import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { downloadPayslipFromStorage } from '@/lib/storage'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: payslip } = await supabase
    .from('payslips')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (!payslip?.storage_path) {
    return NextResponse.json({ error: '명세서 없음' }, { status: 404 })
  }

  try {
    const pdfBuffer = await downloadPayslipFromStorage(payslip.storage_path)
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `PDF 불러오기 실패: ${message}` }, { status: 502 })
  }
}
