import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { calculateAnnualLeave, countWorkdays, hoursTodays } from '@/lib/leaveCalculator'

// 직원 토큰으로 employees 조회
async function getEmployeeByToken(token: string) {
  const { rows } = await pool.query(
    `SELECT id, name, hire_date FROM employees WHERE employee_token = $1 AND is_active = true`,
    [token]
  )
  return rows[0] ?? null
}

// GET /api/employee/[token]/leave - 연차 현황 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const emp = await getEmployeeByToken(token)
  if (!emp) return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 })

  const year = new Date().getFullYear()

  // 총 연차
  const total_days = emp.hire_date ? calculateAnnualLeave(emp.hire_date, year) : 0

  // 사용/대기 연차 집계
  const { rows: summary } = await pool.query(
    `SELECT
       COALESCE(SUM(used_days) FILTER (WHERE status IN ('level1_approved','approved')), 0) AS used_days,
       COALESCE(SUM(used_days) FILTER (WHERE status = 'pending'), 0) AS pending_days
     FROM leave_requests
     WHERE employee_id = $1
       AND EXTRACT(YEAR FROM start_date) = $2`,
    [emp.id, year]
  )
  const { used_days, pending_days } = summary[0]

  // 신청 목록 (최근 20건)
  const { rows: requests } = await pool.query(
    `SELECT lr.*,
       json_agg(la ORDER BY la.created_at) FILTER (WHERE la.id IS NOT NULL) AS approvals
     FROM leave_requests lr
     LEFT JOIN leave_approvals la ON la.request_id = lr.id
     WHERE lr.employee_id = $1
     GROUP BY lr.id
     ORDER BY lr.created_at DESC
     LIMIT 20`,
    [emp.id]
  )

  return NextResponse.json({
    balance: {
      total_days: Number(total_days),
      used_days: Number(used_days),
      pending_days: Number(pending_days),
      remaining_days: Number(total_days) - Number(used_days) - Number(pending_days),
    },
    requests,
  })
}

// POST /api/employee/[token]/leave - 연차 신청
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const emp = await getEmployeeByToken(token)
  if (!emp) return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 })

  const body = await request.json()
  const { leave_type, start_date, end_date, start_hour, end_hour, reason } = body

  if (!leave_type || !start_date) {
    return NextResponse.json({ error: '휴가 유형과 시작일은 필수입니다.' }, { status: 400 })
  }

  let used_days = 0

  if (leave_type === 'annual') {
    if (!end_date) return NextResponse.json({ error: '종료일이 필요합니다.' }, { status: 400 })
    used_days = countWorkdays(start_date, end_date)
    if (used_days <= 0) return NextResponse.json({ error: '유효한 근무일이 없습니다.' }, { status: 400 })
  } else if (leave_type === 'hourly') {
    if (!start_hour || !end_hour) {
      return NextResponse.json({ error: '시작/종료 시각이 필요합니다.' }, { status: 400 })
    }
    const hours = end_hour - start_hour
    if (hours <= 0) return NextResponse.json({ error: '종료 시각이 시작 시각보다 늦어야 합니다.' }, { status: 400 })
    used_days = hoursTodays(hours)
  } else {
    return NextResponse.json({ error: '유효하지 않은 휴가 유형입니다.' }, { status: 400 })
  }

  // 잔여 연차 확인
  const year = new Date(start_date).getFullYear()
  const total_days = emp.hire_date ? calculateAnnualLeave(emp.hire_date, year) : 0

  const { rows: summary } = await pool.query(
    `SELECT
       COALESCE(SUM(used_days) FILTER (WHERE status IN ('level1_approved','approved')), 0) AS used_days,
       COALESCE(SUM(used_days) FILTER (WHERE status = 'pending'), 0) AS pending_days
     FROM leave_requests
     WHERE employee_id = $1 AND EXTRACT(YEAR FROM start_date) = $2`,
    [emp.id, year]
  )
  const remaining = total_days - Number(summary[0].used_days) - Number(summary[0].pending_days)
  if (used_days > remaining) {
    return NextResponse.json(
      { error: `잔여 연차가 부족합니다. (잔여: ${remaining}일, 신청: ${used_days}일)` },
      { status: 400 }
    )
  }

  const { rows } = await pool.query(
    `INSERT INTO leave_requests
       (employee_id, leave_type, start_date, end_date, start_hour, end_hour, used_days, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [emp.id, leave_type, start_date, end_date ?? null, start_hour ?? null, end_hour ?? null, used_days, reason ?? null]
  )

  return NextResponse.json({ data: rows[0] }, { status: 201 })
}
