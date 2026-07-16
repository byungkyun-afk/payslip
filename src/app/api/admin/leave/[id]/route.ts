import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST /api/admin/leave/[id] - 결재 처리
// body: { action: 'approve' | 'reject', level: 1 | 2, comment?: string, rejected_reason?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action, level, comment, rejected_reason } = await request.json()

  if (!action || !level) {
    return NextResponse.json({ error: 'action과 level은 필수입니다.' }, { status: 400 })
  }

  // 현재 신청 상태 확인
  const { rows } = await pool.query(
    `SELECT id, status FROM leave_requests WHERE id = $1`,
    [id]
  )
  const req = rows[0]
  if (!req) return NextResponse.json({ error: '존재하지 않는 신청입니다.' }, { status: 404 })

  if (req.status === 'approved' || req.status === 'rejected') {
    return NextResponse.json({ error: '이미 처리된 신청입니다.' }, { status: 400 })
  }

  // 상태 업데이트
  let newStatus: string
  if (action === 'reject') {
    newStatus = 'rejected'
  } else if (level === 1) {
    newStatus = 'level1_approved'
  } else {
    newStatus = 'approved'
  }

  await pool.query(
    `UPDATE leave_requests
     SET status = $1, rejected_reason = $2, updated_at = now()
     WHERE id = $3`,
    [newStatus, action === 'reject' ? (rejected_reason ?? null) : null, id]
  )

  // 결재 이력 기록
  await pool.query(
    `INSERT INTO leave_approvals (request_id, approver_id, approval_level, action, comment)
     VALUES ($1, NULL, $2, $3, $4)`,
    [id, level, action, comment ?? null]
  )

  return NextResponse.json({ success: true, status: newStatus })
}
