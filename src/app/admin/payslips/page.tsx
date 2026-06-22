'use client'

import { useState, useEffect } from 'react'
import { Payslip } from '@/types'

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString())

  useEffect(() => {
    fetch('/api/admin/payslips')
      .then(r => r.json())
      .then(({ data }) => { setPayslips(data ?? []); setLoading(false) })
  }, [])

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filtered = payslips.filter(p =>
    p.pay_year === parseInt(filterYear) && p.pay_month === parseInt(filterMonth)
  )

  // 존재하는 연월 목록 (드롭다운용)
  const periods = Array.from(
    new Set(payslips.map(p => `${p.pay_year}-${p.pay_month}`))
  ).sort().reverse()

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">발송 현황</h1>

      {/* 월별 필터 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">급여월 선택</span>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>

        {/* 업로드된 월 빠른 선택 */}
        {periods.length > 0 && (
          <div className="flex gap-2 flex-wrap ml-2">
            {periods.map(p => {
              const [y, m] = p.split('-')
              const active = filterYear === y && filterMonth === m
              return (
                <button key={p} onClick={() => { setFilterYear(y); setFilterMonth(m) }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                  {y}년 {m}월
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {filterYear}년 {filterMonth}월 — {filtered.length}명
            </span>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>알림톡 발송: {filtered.filter(p => p.is_notified).length}명</span>
              <span>열람: {filtered.filter(p => p.downloaded_at).length}명</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['직원', '직위', '알림톡 발송', '열람 여부', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  {payslips.length === 0 ? '업로드된 명세서가 없습니다.' : `${filterYear}년 ${filterMonth}월 업로드 내역이 없습니다.`}
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.employee?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.employee?.position ?? '-'}</td>
                  <td className="px-4 py-3">
                    {p.is_notified
                      ? <span className="text-green-600">✓ {formatDate(p.notified_at)}</span>
                      : <span className="text-gray-400">미발송</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.downloaded_at
                      ? <span className="text-blue-600">✓ {formatDate(p.downloaded_at)}</span>
                      : <span className="text-gray-400">미열람</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => window.open(`/api/admin/payslips/${p.id}`, '_blank')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      PDF 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
