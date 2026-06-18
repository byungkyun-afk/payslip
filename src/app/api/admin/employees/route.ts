import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 직원 목록 조회
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// 직원 추가
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, id_prefix, department, position } = body

  if (!name || !phone || !id_prefix) {
    return NextResponse.json({ error: '이름, 전화번호, 주민번호 앞6자리는 필수입니다.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('employees')
    .insert({ name, phone, id_prefix, department, position })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
