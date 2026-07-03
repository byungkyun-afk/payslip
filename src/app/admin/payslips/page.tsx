'use client'

import { useState, useEffect } from 'react'
import { Payslip } from '@/types'

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ name: string; success: boolean; error?: string }[] | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/payslips')
      .then(r => r.json())
      .then(({ data }) => { setPayslips(data ?? []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  // 필터 바뀌면 선택 초기화
  useEffect(() => { setSelected(new Set()); setSendResult(null) }, [filterYear, filterMonth])

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filtered = payslips.filter(p =>
    p.pay_year === parseInt(filterYear) && p.pay_month === parseInt(filterMonth)
  )

  const periods = Array.from(
    new Set(payslips.map(p => `${p.pay_year}-${p.pay_month}`))
  ).sort().reverse()

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const allChecked = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const someChecked = filtered.some(p => selected.has(p.id))

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(p => p.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!selected.size) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payslipIds: Array.from(selected),
          payYear: parseInt(filterYear),
          payMonth: parseInt(filterMonth),
        }),
      })
      const { results } = await res.json()
      setSendResult(results.map((r: { employeeName: string; success: boolean; error?: string }) => ({
        name: r.employeeName,
        success: r.success,
        error: r.error,
      })))
      setSelected(new Set())
      load()
    } catch {
      setSendResult([{ name: '오류', success: false, error: '네트워크 오류' }])
    } finally {
      setSending(false)
    }
  }

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

      {/* 발송 결과 */}
      {sendResult && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">발송 결과</p>
          <div className="space-y-1">
            {sendResult.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={r.success ? 'text-green-600' : 'text-red-500'}>{r.success ? '✓' : '✗'}</span>
                <span className="font-medium">{r.name}</span>
                {!r.success && <span className="text-red-400 text-xs">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {filterYear}년 {filterMonth}월 — {filtered.length}명
              <span className="ml-3 text-gray-400 font-normal text-xs">
                알림톡: {filtered.filter(p => p.is_notified).length}명 · 열람: {filtered.filter(p => p.downloaded_at).length}명
              </span>
              <button onClick={load} className="ml-3 text-xs text-blue-500 hover:underline cursor-pointer">↻ 새로고침</button>
            </span>
            {someChecked && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {sending ? '발송 중...' : `선택 ${selected.size}명 알림톡 발송`}
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                    onChange={toggleAll}
                    className="rounded" />
                </th>
                {['직원', '직위', '알림톡 발송', '열람 여부', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {payslips.length === 0 ? '업로드된 명세서가 없습니다.' : `${filterYear}년 ${filterMonth}월 업로드 내역이 없습니다.`}
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${selected.has(p.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="rounded" />
                  </td>
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
                      className="text-xs text-blue-600 hover:underline">
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
