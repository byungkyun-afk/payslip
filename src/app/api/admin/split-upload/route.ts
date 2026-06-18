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

  const results = []

  for (const { pageIndex, employeeId } of mappings) {
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      results.push({ employeeId, employeeName: null, payslipId: null, success: false, error: '직원 없음' })
      continue
    }

    // 페이지 추출
    const newPdf = await PDFDocument.create()
    const [page] = await newPdf.copyPages(srcPdf, [pageIndex])
    newPdf.addPage(page)
    const pdfBytes = await newPdf.save()

    // Cloudinary 업로드
    const filename = `${employee.name}_${payYear}${String(payMonth).padStart(2, '0')}`
    const { public_id } = await uploadPayslipPdf(Buffer.from(pdfBytes), filename)

    // DB 저장
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
      results.push({ employeeId, employeeName: employee.name, payslipId: null, success: false, error: dbError.message })
      continue
    }

    results.push({ employeeId, employeeName: employee.name, payslipId: payslip.id, success: true })
  }

  return NextResponse.json({ results })
}
