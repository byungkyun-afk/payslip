import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { name, phone, id_prefix, department, position } = await request.json()

  const { rows } = await pool.query(
    `UPDATE employees SET name=$1, phone=$2, id_prefix=$3, department=$4, position=$5
     WHERE id=$6 RETURNING *`,
    [name, phone, id_prefix, department, position, id]
  )
  return NextResponse.json({ data: rows[0] })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await pool.query('UPDATE employees SET is_active=false WHERE id=$1', [id])
  return NextResponse.json({ success: true })
}
