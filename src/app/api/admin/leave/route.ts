import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { calculateAnnualLeave } from '@/lib/leaveCalculator'

// GET /api/admin/leave - 전체 연차 신청 목록
export async function GET() {
  const { rows } = await pool.query(
    `SELECT
       lr.*,
       e.name  AS employee_name,
       e.department,
       e.position,
       json_agg(la ORDER BY la.created_at) FILTER (WHERE la.id IS NOT NULL) AS approvals
     FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     LEFT JOIN leave_approvals la ON la.request_id = lr.id
     GROUP BY lr.id, e.name, e.department, e.position
     ORDER BY lr.created_at DESC
     LIMIT 100`
  )
  return NextResponse.json({ data: rows })
}
