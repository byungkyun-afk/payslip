import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { downloadPayslipFromS3 } from '@/lib/s3'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { rows } = await pool.query('SELECT storage_path FROM payslips WHERE id=$1', [id])
  const payslip = rows[0]

  if (!payslip?.storage_path) {
    return NextResponse.json({ error: '명세서 없음' }, { status: 404 })
  }

  try {
    const pdfBuffer = await downloadPayslipFromS3(payslip.storage_path)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `PDF 불러오기 실패: ${message}` }, { status: 502 })
  }
}
