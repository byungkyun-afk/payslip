import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/admin/leave/employee/[id]?year=2026
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const year = request.nextUrl.searchParams.get('year') ?? new Date().getFullYear().toString()

  const { rows } = await pool.query(
    `SELECT lr.*
     FROM leave_requests lr
     WHERE lr.employee_id = $1
       AND EXTRACT(YEAR FROM lr.start_date) = $2
     ORDER BY lr.start_date DESC`,
    [id, year]
  )

  return NextResponse.json({ data: rows })
}
