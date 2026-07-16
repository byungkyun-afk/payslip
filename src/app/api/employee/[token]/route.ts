import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST /api/employee/[token] - 주민번호 앞6자리로 직원 인증
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { id_prefix } = await request.json()

  const { rows } = await pool.query(
    `SELECT id, name, department, position, hire_date, is_approver
     FROM employees
     WHERE employee_token = $1 AND is_active = true`,
    [token]
  )

  const emp = rows[0]
  if (!emp) {
    return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 })
  }

  // 주민번호 검증
  const { rows: authRows } = await pool.query(
    `SELECT id FROM employees WHERE employee_token = $1 AND id_prefix = $2`,
    [token, id_prefix]
  )
  if (authRows.length === 0) {
    return NextResponse.json({ error: '주민번호 앞 6자리가 일치하지 않습니다.' }, { status: 401 })
  }

  return NextResponse.json({
    id: emp.id,
    name: emp.name,
    department: emp.department,
    position: emp.position,
    hire_date: emp.hire_date,
    is_approver: emp.is_approver,
  })
}
