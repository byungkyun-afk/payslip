'use client'

import { useState, use } from 'react'

interface PayslipInfo {
  employee_name: string
  pay_year: number
  pay_month: number
  pdf_url: string
}

export default function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [idPrefix, setIdPrefix] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payslip, setPayslip] = useState<PayslipInfo | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/payslip/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_prefix: idPrefix }),
    })
    const json = await res.json()

    if (res.ok) {
      setPayslip(json)
    } else {
      setError(json.error)
    }
    setLoading(false)
  }

  if (payslip) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-12 px-4">
        <div className="bg-white rounded-xl shadow-sm p-6 w-full max-w-lg text-center">
          <div className="text-4xl mb-3">📄</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {payslip.employee_name}님의 급여명세서
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {payslip.pay_year}년 {payslip.pay_month}월
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href={payslip.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              PDF 열람
            </a>
            <a
              href={payslip.pdf_url}
              download
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              다운로드
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">링크는 1시간 후 만료됩니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-sm">
        <div className="text-3xl mb-3">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">급여명세서 열람</h1>
        <p className="text-sm text-gray-500 mb-6">본인 확인을 위해 주민번호 앞 6자리를 입력해주세요.</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주민번호 앞 6자리
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={idPrefix}
              onChange={e => setIdPrefix(e.target.value.replace(/\D/g, ''))}
              placeholder="예) 900101"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || idPrefix.length !== 6}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '확인 중...' : '확인'}
          </button>
        </form>
      </div>
    </div>
  )
}
