import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendPayslipAlimtalk } from '@/lib/coolsms'

export async function POST(request: NextRequest) {
  const { payslipIds, payYear, payMonth } = await request.json()

  if (!payslipIds?.length) {
    return NextResponse.json({ error: '발송할 명세서가 없습니다.' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const results = []

  for (const payslipId of payslipIds) {
    const { rows } = await pool.query(
      `SELECT p.*, e.name as employee_name, e.phone
       FROM payslips p JOIN employees e ON p.employee_id = e.id
       WHERE p.id=$1`,
      [payslipId]
    )
    const payslip = rows[0]

    if (!payslip) {
      results.push({ payslipId, success: false, error: '명세서 없음' })
      continue
    }

    try {
      const sendResult = await sendPayslipAlimtalk({
        to: payslip.phone,
        employeeName: payslip.employee_name,
        payMonth: `${payYear}년 ${payMonth}월`,
        accessUrl: `${appUrl}/view/${payslip.access_token}`,
      })
      if (!sendResult.success) {
        throw new Error(sendResult.error instanceof Error ? sendResult.error.message : JSON.stringify(sendResult.error))
      }
      await pool.query(
        'UPDATE payslips SET is_notified=true, notified_at=now() WHERE id=$1',
        [payslipId]
      )
      results.push({ payslipId, employeeName: payslip.employee_name, success: true })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류'
      results.push({ payslipId, employeeName: payslip.employee_name, success: false, error: message })
    }
  }

  return NextResponse.json({ results })
}
