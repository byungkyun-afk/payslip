'use client'

import { useState, useEffect } from 'react'
import { Employee } from '@/types'

export default function UploadPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState({
    employee_id: '',
    pay_year: new Date().getFullYear().toString(),
    pay_month: (new Date().getMonth() + 1).toString(),
    send_alimtalk: true,
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(({ data }) => setEmployees(data?.filter((e: Employee) => e.is_active) ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('employee_id', form.employee_id)
    formData.append('pay_year', form.pay_year)
    formData.append('pay_month', form.pay_month)
    formData.append('send_alimtalk', form.send_alimtalk.toString())

    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const json = await res.json()

    setResult(res.ok ? { success: true } : { error: json.error })
    setLoading(false)
    if (res.ok) {
      setFile(null)
      setForm(f => ({ ...f, employee_id: '' }))
    }
  }

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">명세서 업로드</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 직원 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직원 선택 *</label>
            <select
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">직원을 선택하세요</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.department ? `(${emp.department})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 급여 연월 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">연도 *</label>
              <select
                value={form.pay_year}
                onChange={e => setForm(f => ({ ...f, pay_year: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">월 *</label>
              <select
                value={form.pay_month}
                onChange={e => setForm(f => ({ ...f, pay_month: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
          </div>

          {/* PDF 파일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF 파일 *</label>
            <input
              type="file"
              accept=".pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>

          {/* 알림톡 발송 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="send_alimtalk"
              checked={form.send_alimtalk}
              onChange={e => setForm(f => ({ ...f, send_alimtalk: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="send_alimtalk" className="text-sm text-gray-700">
              카카오 알림톡 발송
            </label>
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {result.success ? '업로드 완료! 알림톡이 발송되었습니다.' : `오류: ${result.error}`}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '업로드 중...' : '업로드 및 발송'}
          </button>
        </form>
      </div>
    </div>
  )
}
