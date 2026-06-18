import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase'
import { uploadPayslipPdf } from '@/lib/cloudinary'

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

  const supabase = createServiceClient()
  const buffer = await file.arrayBuffer()
  const srcPdf = await PDFDocument.load(buffer)

  // 직원 정보 한 번에 조회
  const employeeIds = mappings.map(m => m.employeeId)
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .in('id', employeeIds)

  const employeeMap = new Map(employees?.map(e => [e.id, e]) ?? [])

  // 1단계: PDF 페이지 추출 (순차 - pdf-lib 병렬 충돌 방지)
  const pageBuffers: { employeeId: string; pdfBytes: Uint8Array }[] = []
  for (const { pageIndex, employeeId } of mappings) {
    const newPdf = await PDFDocument.create()
    const [page] = await newPdf.copyPages(srcPdf, [pageIndex])
    newPdf.addPage(page)
    const pdfBytes = await newPdf.save()
    pageBuffers.push({ employeeId, pdfBytes })
  }

  // 2단계: Cloudinary 업로드 + DB 저장 (병렬)
  const results = await Promise.all(
    pageBuffers.map(async ({ employeeId, pdfBytes }) => {
      const employee = employeeMap.get(employeeId)
      if (!employee) {
        return { employeeId, employeeName: null, payslipId: null, success: false, error: '직원 없음' }
      }

      try {
        const filename = `${employee.name}_${payYear}${String(payMonth).padStart(2, '0')}`
        const { public_id } = await uploadPayslipPdf(Buffer.from(pdfBytes), filename)

        const { data: payslip, error: dbError } = await supabase
          .from('payslips')
          .upsert({
            employee_id: employeeId,
            pay_year: payYear,
            pay_month: payMonth,
            cloudinary_id: public_id,
          }, { onConflict: 'employee_id,pay_year,pay_month' })
          .select()
          .single()

        if (dbError) {
          return { employeeId, employeeName: employee.name, payslipId: null, success: false, error: dbError.message }
        }

        return { employeeId, employeeName: employee.name, payslipId: payslip.id, success: true }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        return { employeeId, employeeName: employee.name, payslipId: null, success: false, error: message }
      }
    })
  )

  return NextResponse.json({ results })
}
