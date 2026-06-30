import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  const { rows } = await pool.query(`
    SELECT p.*, e.name as employee_name, e.department, e.position
    FROM payslips p
    LEFT JOIN employees e ON p.employee_id = e.id
    ORDER BY p.created_at DESC
  `)
  const data = rows.map(r => ({
    ...r,
    employee: { name: r.employee_name, department: r.department, position: r.position },
  }))
  return NextResponse.json({ data })
}
