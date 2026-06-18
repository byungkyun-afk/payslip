import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { uploadPayslipPdf } from '@/lib/cloudinary'
import { sendPayslipAlimtalk } from '@/lib/coolsms'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const employeeId = formData.get('employee_id') as string
  const payYear = parseInt(formData.get('pay_year') as string)
  const payMonth = parseInt(formData.get('pay_month') as string)
  const sendAlimtalk = formData.get('send_alimtalk') === 'true'

  if (!file || !employeeId || !payYear || !payMonth) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 직원 정보 조회
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) {
    return NextResponse.json({ error: '직원 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // Cloudinary 업로드
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${employee.name}_${payYear}${String(payMonth).padStart(2, '0')}`

  const { public_id } = await uploadPayslipPdf(buffer, filename)

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
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // 알림톡 발송
  if (sendAlimtalk) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const accessUrl = `${appUrl}/view/${payslip.access_token}`
    const payMonth_str = `${payYear}년 ${payMonth}월`

    const alimtalkResult = await sendPayslipAlimtalk({
      to: employee.phone,
      employeeName: employee.name,
      payMonth: payMonth_str,
      accessUrl,
    })

    if (alimtalkResult.success) {
      await supabase
        .from('payslips')
        .update({ is_notified: true, notified_at: new Date().toISOString() })
        .eq('id', payslip.id)
    }
  }

  return NextResponse.json({ success: true, payslip })
}
