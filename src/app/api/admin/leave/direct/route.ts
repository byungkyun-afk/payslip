import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { countWorkdays, hoursTodays } from '@/lib/leaveCalculator'

// POST /api/admin/leave/direct - 관리자 직접 연차 입력 (즉시 approved)
export async function POST(request: NextRequest) {
  const { employee_id, leave_type, start_date, end_date, start_hour, end_hour, reason } =
    await request.json()

  if (!employee_id || !leave_type || !start_date) {
    return NextResponse.json({ error: '직원, 유형, 날짜는 필수입니다.' }, { status: 400 })
  }

  let used_days = 0

  if (leave_type === 'annual') {
    if (!end_date) return NextResponse.json({ error: '종료일이 필요합니다.' }, { status: 400 })
    used_days = countWorkdays(start_date, end_date)
    if (used_days <= 0) return NextResponse.json({ error: '유효한 근무일이 없습니다.' }, { status: 400 })
  } else if (leave_type === 'hourly') {
    if (start_hour == null || end_hour == null) {
      return NextResponse.json({ error: '시작/종료 시각이 필요합니다.' }, { status: 400 })
    }
    const hours = end_hour - start_hour
    if (hours <= 0) return NextResponse.json({ error: '종료 시각이 시작 시각보다 늦어야 합니다.' }, { status: 400 })
    used_days = hoursTodays(hours)
  }

  // 즉시 approved 상태로 저장
  const { rows } = await pool.query(
    `INSERT INTO leave_requests
       (employee_id, leave_type, start_date, end_date, start_hour, end_hour, used_days, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')
     RETURNING *`,
    [employee_id, leave_type, start_date, end_date ?? null, start_hour ?? null, end_hour ?? null, used_days, reason ?? null]
  )

  // 결재 이력 기록 (관리자 직접 입력)
  await pool.query(
    `INSERT INTO leave_approvals (request_id, approver_id, approval_level, action, comment)
     VALUES ($1, NULL, 2, 'approve', '관리자 직접 입력')`,
    [rows[0].id]
  )

  return NextResponse.json({ data: rows[0] }, { status: 201 })
}
