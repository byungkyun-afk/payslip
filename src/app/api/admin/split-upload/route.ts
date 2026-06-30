import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import pool from '@/lib/db'
import { uploadPayslipToS3 } from '@/lib/s3'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const payYear = parseInt(formData.get('pay_year') as string)
  const payMonth = parseInt(formData.get('pay_month') as string)
  const mappingsRaw = formData.get('mappings') as string
  const mappings: { pageIndex: number; employeeId: string }[] = JSON.parse(mappingsRaw)

  if (!file || !mappings.length) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const srcPdf = await PDFDocument.load(buffer)

  const employeeIds = mappings.map(m => m.employeeId)
  const placeholders = employeeIds.map((_, i) => `$${i + 1}`).join(',')
  const { rows: employees } = await pool.query(
    `SELECT * FROM employees WHERE id IN (${placeholders})`,
    employeeIds
  )
  const employeeMap = new Map(employees.map((e: { id: string }) => [e.id, e]))

  // 1단계: PDF 페이지 순차 추출
  const pageBuffers: { employeeId: string; pdfBytes: Uint8Array }[] = []
  for (const { pageIndex, employeeId } of mappings) {
    const newPdf = await PDFDocument.create()
    const [page] = await newPdf.copyPages(srcPdf, [pageIndex])
    newPdf.addPage(page)
    const pdfBytes = await newPdf.save()
    pageBuffers.push({ employeeId, pdfBytes })
  }

  // 2단계: S3 업로드 + DB 저장 (병렬)
  const results = await Promise.all(
    pageBuffers.map(async ({ employeeId, pdfBytes }) => {
      const employee = employeeMap.get(employeeId) as { id: string; name: string } | undefined
      if (!employee) {
        return { employeeId, employeeName: null, payslipId: null, success: false, error: '직원 없음' }
      }

      try {
        const monthPadded = String(payMonth).padStart(2, '0')
        const storagePath = `${employeeId}/${payYear}${monthPadded}.pdf`

        await uploadPayslipToS3(Buffer.from(pdfBytes), storagePath)

        const { rows } = await pool.query(
          `INSERT INTO payslips (employee_id, pay_year, pay_month, storage_path)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, pay_year, pay_month)
           DO UPDATE SET storage_path=$4, updated_at=now()
           RETURNING *`,
          [employeeId, payYear, payMonth, storagePath]
        )

        return { employeeId, employeeName: employee.name, payslipId: rows[0].id, success: true }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        return { employeeId, employeeName: employee.name, payslipId: null, success: false, error: message }
      }
    })
  )

  return NextResponse.json({ results })
}
