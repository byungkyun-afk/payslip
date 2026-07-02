import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL ?? 'NOT SET'
    // 비밀번호 마스킹
    const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@')

    const { rows: dbInfo } = await pool.query('SELECT current_database(), version()')
    const { rows: tables } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    )
    const { rows: empCount } = await pool.query(
      `SELECT COUNT(*) FROM employees`
    ).catch(() => ({ rows: [{ count: 'TABLE NOT FOUND' }] }))

    return NextResponse.json({
      database_url: maskedUrl,
      current_db: dbInfo[0].current_database,
      tables: tables.map((t: { table_name: string }) => t.table_name),
      employee_count: empCount[0].count,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
