import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/admin/leave?year=2026
export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get('year') ?? new Date().getFullYear().toString()

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
     WHERE EXTRACT(YEAR FROM lr.start_date) = $1
     GROUP BY lr.id, e.name, e.department, e.position
     ORDER BY lr.start_date DESC`,
    [year]
  )
  return NextResponse.json({ data: rows })
}
