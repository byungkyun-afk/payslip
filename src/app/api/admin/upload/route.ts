import { NextResponse } from 'next/server'

// 구버전 API - split-upload로 대체됨
export async function POST() {
  return NextResponse.json({ error: 'Use /api/admin/split-upload instead' }, { status: 410 })
}
