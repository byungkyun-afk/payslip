'use client'

import { useState, useEffect } from 'react'
import { Payslip } from '@/types'

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/payslips')
      .then(r => r.json())
      .then(({ data }) => { setPayslips(data ?? []); setLoading(false) })
  }, [])

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">발송 현황</h1>

      {loading ? (
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['직원', '부서', '급여월', '알림톡 발송', '열람 여부'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payslips.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">발송 내역이 없습니다.</td></tr>
              ) : payslips.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.employee?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.employee?.department ?? '-'}</td>
                  <td className="px-4 py-3">{p.pay_year}년 {p.pay_month}월</td>
                  <td className="px-4 py-3">
                    {p.is_notified ? (
                      <span className="text-green-600">✓ {formatDate(p.notified_at)}</span>
                    ) : (
                      <span className="text-gray-400">미발송</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.downloaded_at ? (
                      <span className="text-blue-600">✓ {formatDate(p.downloaded_at)}</span>
                    ) : (
                      <span className="text-gray-400">미열람</span>
                    )}
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
