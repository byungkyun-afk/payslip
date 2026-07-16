import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { countWorkdays, hoursTodays, calcActualHours } from '@/lib/leaveCalculator'

// POST /api/admin/leave/[id] - 결재 처리
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action, level, comment, rejected_reason } = await request.json()

  if (!action || !level) {
    return NextResponse.json({ error: 'action과 level은 필수입니다.' }, { status: 400 })
  }

  const { rows } = await pool.query(
    `SELECT id, status FROM leave_requests WHERE id = $1`, [id]
  )
  const req = rows[0]
  if (!req) return NextResponse.json({ error: '존재하지 않는 신청입니다.' }, { status: 404 })

  if (req.status === 'approved' || req.status === 'rejected') {
    return NextResponse.json({ error: '이미 처리된 신청입니다.' }, { status: 400 })
  }

  let newStatus: string
  if (action === 'reject') {
    newStatus = 'rejected'
  } else if (level === 1) {
    newStatus = 'level1_approved'
  } else {
    newStatus = 'approved'
  }

  await pool.query(
    `UPDATE leave_requests SET status = $1, rejected_reason = $2, updated_at = now() WHERE id = $3`,
    [newStatus, action === 'reject' ? (rejected_reason ?? null) : null, id]
  )

  await pool.query(
    `INSERT INTO leave_approvals (request_id, approver_id, approval_level, action, comment)
     VALUES ($1, NULL, $2, $3, $4)`,
    [id, level, action, comment ?? null]
  )

  return NextResponse.json({ success: true, status: newStatus })
}

// PATCH /api/admin/leave/[id] - 연차 내역 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { leave_type, start_date, end_date, start_hour, end_hour, reason } = await request.json()

  if (!leave_type || !start_date) {
    return NextResponse.json({ error: '유형과 시작일은 필수입니다.' }, { status: 400 })
  }

  let used_days = 0
  if (leave_type === 'annual') {
    if (!end_date) return NextResponse.json({ error: '종료일이 필요합니다.' }, { status: 400 })
    used_days = countWorkdays(start_date, end_date)
    if (used_days <= 0) return NextResponse.json({ error: '유효한 근무일이 없습니다.' }, { status: 400 })
  } else {
    if (start_hour == null || end_hour == null) {
      return NextResponse.json({ error: '시작/종료 시각이 필요합니다.' }, { status: 400 })
    }
    const hours = calcActualHours(start_hour, end_hour)
    if (hours <= 0) return NextResponse.json({ error: '유효한 시간이 없습니다.' }, { status: 400 })
    used_days = hoursTodays(hours)
  }

  const { rows } = await pool.query(
    `UPDATE leave_requests
     SET leave_type = $1, start_date = $2, end_date = $3,
         start_hour = $4, end_hour = $5, used_days = $6, reason = $7, updated_at = now()
     WHERE id = $8
     RETURNING *`,
    [leave_type, start_date, end_date ?? null, start_hour ?? null, end_hour ?? null, used_days, reason ?? null, id]
  )

  if (!rows[0]) return NextResponse.json({ error: '존재하지 않는 내역입니다.' }, { status: 404 })
  return NextResponse.json({ data: rows[0] })
}

// DELETE /api/admin/leave/[id] - 연차 내역 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await pool.query(`DELETE FROM leave_requests WHERE id = $1`, [id])
  return NextResponse.json({ success: true })
}
