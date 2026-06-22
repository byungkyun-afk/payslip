import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateSignedUrl } from '@/lib/cloudinary'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: payslip } = await supabase
    .from('payslips')
    .select('*')
    .eq('id', id)
    .single()

  if (!payslip) {
    return NextResponse.json({ error: '명세서 없음' }, { status: 404 })
  }

  const url = generateSignedUrl(payslip.cloudinary_id, 1800)
  return NextResponse.json({ url })
}
