import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  const { rows } = await pool.query('SELECT * FROM employees ORDER BY name')
  return NextResponse.json({ data: rows })
}

export async function POST(request: NextRequest) {
  const { name, phone, id_prefix, department, position, hire_date, is_approver } = await request.json()

  if (!name || !phone || !id_prefix) {
    return NextResponse.json({ error: '이름, 전화번호, 주민번호 앞6자리는 필수입니다.' }, { status: 400 })
  }

  const { rows } = await pool.query(
    `INSERT INTO employees (name, phone, id_prefix, department, position, hire_date, is_approver)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [name, phone, id_prefix, department, position, hire_date || null, is_approver ?? false]
  )
  return NextResponse.json({ data: rows[0] }, { status: 201 })
}
