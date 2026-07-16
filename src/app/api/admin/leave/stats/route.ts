import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { calculateAnnualLeave } from '@/lib/leaveCalculator'

// GET /api/admin/leave/stats - 직원별 연차 사용현황
export async function GET() {
  const year = new Date().getFullYear()

  const { rows: employees } = await pool.query(
    `SELECT id, name, department, position, hire_date
     FROM employees WHERE is_active = true ORDER BY name`
  )

  const { rows: usage } = await pool.query(
    `SELECT
       employee_id,
       COALESCE(SUM(used_days) FILTER (WHERE status IN ('level1_approved','approved')), 0) AS used_days,
       COALESCE(SUM(used_days) FILTER (WHERE status = 'pending'), 0) AS pending_days
     FROM leave_requests
     WHERE EXTRACT(YEAR FROM start_date) = $1
     GROUP BY employee_id`,
    [year]
  )

  const usageMap = new Map(usage.map(u => [u.employee_id, u]))

  const stats = employees.map(emp => {
    const total_days = emp.hire_date ? calculateAnnualLeave(emp.hire_date, year) : 0
    const u = usageMap.get(emp.id)
    const used_days = u ? Number(u.used_days) : 0
    const pending_days = u ? Number(u.pending_days) : 0
    return {
      ...emp,
      total_days,
      used_days,
      pending_days,
      remaining_days: total_days - used_days - pending_days,
    }
  })

  return NextResponse.json({ data: stats, year })
}
