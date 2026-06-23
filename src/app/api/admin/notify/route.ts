import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendPayslipAlimtalk } from '@/lib/coolsms'

export async function POST(request: NextRequest) {
  const { payslipIds, payYear, payMonth } = await request.json()

  if (!payslipIds?.length) {
    return NextResponse.json({ error: '발송할 명세서가 없습니다.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const results = []

  for (const payslipId of payslipIds) {
    const { data: payslip } = await supabase
      .from('payslips')
      .select('*, employees(*)')
      .eq('id', payslipId)
      .single()

    if (!payslip) {
      results.push({ payslipId, success: false, error: '명세서 없음' })
      continue
    }

    try {
      const sendResult = await sendPayslipAlimtalk({
        to: payslip.employees.phone,
        employeeName: payslip.employees.name,
        payMonth: `${payYear}년 ${payMonth}월`,
        accessUrl: `${appUrl}/view/${payslip.access_token}`,
      })
      if (!sendResult.success) {
        throw new Error(JSON.stringify(sendResult.error))
      }
      await supabase
        .from('payslips')
        .update({ is_notified: true, notified_at: new Date().toISOString() })
        .eq('id', payslipId)
      results.push({ payslipId, employeeName: payslip.employees.name, success: true })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류'
      results.push({ payslipId, employeeName: payslip.employees.name, success: false, error: message })
    }
  }

  return NextResponse.json({ results })
}
