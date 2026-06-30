import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { createS3SignedUrl } from '@/lib/s3'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { id_prefix } = await request.json()

  const { rows } = await pool.query(
    `SELECT p.*, e.name as employee_name, e.id_prefix
     FROM payslips p JOIN employees e ON p.employee_id = e.id
     WHERE p.access_token=$1`,
    [token]
  )
  const payslip = rows[0]

  if (!payslip) {
    return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 })
  }

  if (new Date(payslip.token_expires_at) < new Date()) {
    return NextResponse.json({ error: '만료된 링크입니다. 관리자에게 문의해주세요.' }, { status: 410 })
  }

  if (payslip.id_prefix !== id_prefix) {
    return NextResponse.json({ error: '주민번호 앞 6자리가 일치하지 않습니다.' }, { status: 401 })
  }

  let pdf_url: string | null = null
  if (payslip.storage_path) {
    try {
      pdf_url = await createS3SignedUrl(payslip.storage_path, 604800)
    } catch {
      pdf_url = null
    }
  }

  if (!payslip.downloaded_at) {
    await pool.query('UPDATE payslips SET downloaded_at=now() WHERE id=$1', [payslip.id])
  }

  return NextResponse.json({
    success: true,
    employee_name: payslip.employee_name,
    pay_year: payslip.pay_year,
    pay_month: payslip.pay_month,
    pdf_url,
  })
}
