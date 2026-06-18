'use client'

import { useState, useEffect } from 'react'
import { Employee } from '@/types'

interface PageMapping {
  pageIndex: number
  employeeId: string
  status: 'pending' | 'done' | 'error'
  message?: string
}

type Step = 'select' | 'map' | 'done'

export default function UploadPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payYear, setPayYear] = useState(new Date().getFullYear().toString())
  const [payMonth, setPayMonth] = useState((new Date().getMonth() + 1).toString())
  const [sendAlimtalk, setSendAlimtalk] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mappings, setMappings] = useState<PageMapping[]>([])
  const [step, setStep] = useState<Step>('select')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ employeeName: string; success: boolean; error?: string }[]>([])

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(({ data }) => setEmployees(data?.filter((e: Employee) => e.is_active) ?? []))
  }, [])

  // PDF 업로드 → 페이지 수 확인
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setLoading(true)

    const fd = new FormData()
    fd.append('file', f)
    const res = await fetch('/api/admin/split-pdf', { method: 'POST', body: fd })
    const { pageCount: count } = await res.json()

    setPageCount(count)
    setMappings(Array.from({ length: count }, (_, i) => ({
      pageIndex: i,
      employeeId: '',
      status: 'pending',
    })))
    setStep('map')
    setLoading(false)
  }

  function setEmployeeId(pageIndex: number, empId: string) {
    setMappings(prev => prev.map(m => m.pageIndex === pageIndex ? { ...m, employeeId: empId } : m))
  }

  const assignedIds = mappings.map(m => m.employeeId).filter(Boolean)
  const allMapped = mappings.length > 0 && mappings.every(m => m.employeeId)

  async function handleSubmit() {
    if (!file || !allMapped) return
    setLoading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('pay_year', payYear)
    fd.append('pay_month', payMonth)
    fd.append('send_alimtalk', sendAlimtalk.toString())
    fd.append('mappings', JSON.stringify(mappings.map(m => ({ pageIndex: m.pageIndex, employeeId: m.employeeId }))))

    const res = await fetch('/api/admin/split-upload', { method: 'POST', body: fd })
    const json = await res.json()

    setResults(json.results ?? [])
    setStep('done')
    setLoading(false)
  }

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">명세서 업로드</h1>

      <div className="max-w-2xl space-y-5">

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

        {/* STEP 1: PDF 선택 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">합쳐진 PDF 업로드</h2>
          <p className="text-xs text-gray-400 mb-3">직원 전체 급여명세서가 합쳐진 PDF 1개를 선택하세요.</p>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {loading && step === 'select' && <p className="text-xs text-blue-600 mt-2">페이지 수 확인 중...</p>}
          {pageCount > 0 && (
            <p className="text-xs text-gray-500 mt-2">총 <strong>{pageCount}페이지</strong> 감지됨</p>
          )}
        </div>

        {/* STEP 2: 페이지-직원 매핑 */}
        {step === 'map' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4 text-xs font-semibold text-gray-500">
              <span>페이지</span>
              <span>직원 배정</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
              {mappings.map((m) => (
                <div key={m.pageIndex} className="px-5 py-2.5 grid grid-cols-2 gap-4 items-center">
                  <span className="text-sm text-gray-700">{m.pageIndex + 1}페이지</span>
                  <select
                    value={m.employeeId}
                    onChange={e => setEmployeeId(m.pageIndex, e.target.value)}
                    className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${!m.employeeId ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  >
                    <option value="">직원 선택</option>
                    {employees.map(emp => (
                      <option
                        key={emp.id}
                        value={emp.id}
                        disabled={assignedIds.includes(emp.id) && m.employeeId !== emp.id}
                      >
                        {emp.name} {emp.department ? `(${emp.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {!allMapped && (
              <div className="px-5 py-2 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">⚠ 배정되지 않은 페이지가 있습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 알림톡 */}
        {step === 'map' && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="send_alimtalk" checked={sendAlimtalk}
              onChange={e => setSendAlimtalk(e.target.checked)} className="rounded w-4 h-4" />
            <label htmlFor="send_alimtalk" className="text-sm text-gray-700">카카오 알림톡 발송</label>
          </div>
        )}

        {/* 업로드 버튼 */}
        {step === 'map' && (
          <button
            onClick={handleSubmit}
            disabled={loading || !allMapped}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '업로드 중...' : `${mappings.length}명 분리 업로드${sendAlimtalk ? ' + 알림톡 발송' : ''}`}
          </button>
        )}

        {/* STEP 3: 결과 */}
        {step === 'done' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-green-50 border-b border-green-100">
              <p className="text-sm font-semibold text-green-700">
                ✓ 업로드 완료 ({results.filter(r => r.success).length}/{results.length}명 성공)
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-gray-700">{r.employeeName}</span>
                  {r.success
                    ? <span className="text-xs text-green-600">✓ 완료</span>
                    : <span className="text-xs text-red-600">✗ {r.error}</span>
                  }
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => { setStep('select'); setFile(null); setPageCount(0); setMappings([]) }}
                className="text-sm text-blue-600 hover:underline"
              >
                다시 업로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
