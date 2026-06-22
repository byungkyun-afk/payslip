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
    .select('pdf_url')
    .eq('id', id)
    .single()

  if (!payslip?.pdf_url) {
    return NextResponse.json({ error: '명세서 없음' }, { status: 404 })
  }

  return NextResponse.json({ url: payslip.pdf_url })
}
