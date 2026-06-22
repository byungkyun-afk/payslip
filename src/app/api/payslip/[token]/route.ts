import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateSignedUrl } from '@/lib/cloudinary'

// 토큰으로 명세서 조회 + 주민번호 인증
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { id_prefix } = await request.json()

  const supabase = createServiceClient()

  // 토큰으로 명세서 조회
  const { data: payslip, error } = await supabase
    .from('payslips')
    .select('*, employee:employees(*)')
    .eq('access_token', token)
    .single()

  if (error || !payslip) {
    return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 })
  }

  // 토큰 만료 확인
  if (new Date(payslip.token_expires_at) < new Date()) {
    return NextResponse.json({ error: '만료된 링크입니다. 관리자에게 문의해주세요.' }, { status: 410 })
  }

  // 주민번호 인증
  if (payslip.employee.id_prefix !== id_prefix) {
    return NextResponse.json({ error: '주민번호 앞 6자리가 일치하지 않습니다.' }, { status: 401 })
  }

  // 최초 열람 시각 기록
  if (!payslip.downloaded_at) {
    await supabase
      .from('payslips')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('id', payslip.id)
  }

  // Cloudinary 서명 URL 생성 (1시간)
  const signedUrl = generateSignedUrl(payslip.cloudinary_id)

  return NextResponse.json({
    success: true,
    employee_name: payslip.employee.name,
    pay_year: payslip.pay_year,
    pay_month: payslip.pay_month,
    pdf_url: signedUrl,
  })
}
