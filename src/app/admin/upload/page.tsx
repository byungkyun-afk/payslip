'use client'

import { useState, useEffect } from 'react'
import { Employee } from '@/types'

interface UploadItem {
  employee: Employee
  file: File | null
  status: 'pending' | 'uploading' | 'done' | 'error'
  message?: string
}

export default function UploadPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<UploadItem[]>([])
  const [payYear, setPayYear] = useState(new Date().getFullYear().toString())
  const [payMonth, setPayMonth] = useState((new Date().getMonth() + 1).toString())
  const [sendAlimtalk, setSendAlimtalk] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(({ data }) => setEmployees(data?.filter((e: Employee) => e.is_active) ?? []))
  }, [])

  // 체크박스 토글
  function toggleEmployee(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setItems(i => i.filter(x => x.employee.id !== id))
      } else {
        next.add(id)
        const emp = employees.find(e => e.id === id)!
        setItems(i => [...i, { employee: emp, file: null, status: 'pending' }])
      }
      return next
    })
  }

  // 전체 선택/해제
  function toggleAll() {
    if (selected.size === employees.length) {
      setSelected(new Set())
      setItems([])
    } else {
      setSelected(new Set(employees.map(e => e.id)))
      setItems(employees.map(emp => ({ employee: emp, file: null, status: 'pending' })))
    }
  }

  // 파일 지정
  function setFile(empId: string, file: File | null) {
    setItems(prev => prev.map(i => i.employee.id === empId ? { ...i, file } : i))
  }

  const allFilesReady = items.length > 0 && items.every(i => i.file)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allFilesReady) return
    setLoading(true)

    for (const item of items) {
      setItems(prev => prev.map(i => i.employee.id === item.employee.id ? { ...i, status: 'uploading' } : i))

      const formData = new FormData()
      formData.append('file', item.file!)
      formData.append('employee_id', item.employee.id)
      formData.append('pay_year', payYear)
      formData.append('pay_month', payMonth)
      formData.append('send_alimtalk', sendAlimtalk.toString())

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const json = await res.json()

      setItems(prev => prev.map(i =>
        i.employee.id === item.employee.id
          ? { ...i, status: res.ok ? 'done' : 'error', message: res.ok ? undefined : json.error }
          : i
      ))
    }
    setLoading(false)
  }

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const allSelected = employees.length > 0 && selected.size === employees.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">명세서 업로드</h1>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

        {/* 급여 연월 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">급여 연월</h2>
          <div className="flex gap-3">
            <select value={payYear} onChange={e => setPayYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={payMonth} onChange={e => setPayMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {months.map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </div>

        {/* 직원 선택 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected }}
              onChange={toggleAll}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-semibold text-gray-700">
              전체 선택 ({selected.size}/{employees.length}명)
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {employees.map(emp => {
              const isChecked = selected.has(emp.id)
              const item = items.find(i => i.employee.id === emp.id)
              return (
                <div key={emp.id} className={`px-5 py-3 flex items-center gap-4 ${isChecked ? 'bg-blue-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="w-28">
                    <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                    {emp.department && <span className="text-xs text-gray-500 ml-1">({emp.department})</span>}
                  </div>

                  {isChecked && (
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setFile(emp.id, e.target.files?.[0] ?? null)}
                        className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700"
                      />
                      {item?.status === 'uploading' && <span className="text-xs text-blue-600">업로드 중...</span>}
                      {item?.status === 'done' && <span className="text-xs text-green-600">✓ 완료</span>}
                      {item?.status === 'error' && <span className="text-xs text-red-600">✗ {item.message}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 알림톡 발송 */}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="send_alimtalk" checked={sendAlimtalk}
            onChange={e => setSendAlimtalk(e.target.checked)} className="rounded w-4 h-4" />
          <label htmlFor="send_alimtalk" className="text-sm text-gray-700">카카오 알림톡 발송</label>
        </div>

        <button
          type="submit"
          disabled={loading || !allFilesReady}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '업로드 중...' : `${selected.size}명 업로드 및 발송`}
        </button>
      </form>
    </div>
  )
}
