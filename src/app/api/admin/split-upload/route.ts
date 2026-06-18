import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase'
import { uploadPayslipPdf } from '@/lib/cloudinary'
import { sendPayslipAlimtalk } from '@/lib/coolsms'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const payYear = parseInt(formData.get('pay_year') as string)
  const payMonth = parseInt(formData.get('pay_month') as string)
  const sendAlimtalk = formData.get('send_alimtalk') === 'true'
  // mappings: JSON 배열 [{ pageIndex: 0, employeeId: 'uuid' }, ...]
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
    // 직원 정보 조회
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      results.push({ employeeId, success: false, error: '직원 없음' })
      continue
    }

    // 해당 페이지만 추출해서 새 PDF 생성
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
      results.push({ employeeId, success: false, error: dbError.message })
      continue
    }

    // 알림톡 발송
    if (sendAlimtalk) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      await sendPayslipAlimtalk({
        to: employee.phone,
        employeeName: employee.name,
        payMonth: `${payYear}년 ${payMonth}월`,
        accessUrl: `${appUrl}/view/${payslip.access_token}`,
      })
      await supabase
        .from('payslips')
        .update({ is_notified: true, notified_at: new Date().toISOString() })
        .eq('id', payslip.id)
    }

    results.push({ employeeId, employeeName: employee.name, success: true })
  }

  return NextResponse.json({ results })
}
