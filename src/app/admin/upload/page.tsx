'use client'

import { useState, useEffect } from 'react'
import { Employee } from '@/types'

interface PageMapping {
  pageIndex: number
  employeeId: string
}

interface UploadResult {
  employeeId: string
  employeeName: string | null
  payslipId: string | null
  success: boolean
  error?: string
  // 알림톡 발송 결과
  notified?: boolean
  notifyError?: string
}

type Step = 'select' | 'map' | 'confirm' | 'done'

export default function UploadPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payYear, setPayYear] = useState(new Date().getFullYear().toString())
  const [payMonth, setPayMonth] = useState((new Date().getMonth() + 1).toString())
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mappings, setMappings] = useState<PageMapping[]>([])
  const [step, setStep] = useState<Step>('select')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [results, setResults] = useState<UploadResult[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(({ data }) => setEmployees(data?.filter((e: Employee) => e.is_active) ?? []))
  }, [])

  // PDF 선택 → 페이지 수 + 자동 매칭
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setLoading(true)
    setLoadingMsg('페이지 수 확인 및 이름 매칭 중...')

    const fd = new FormData()
    fd.append('file', f)
    const res = await fetch('/api/admin/split-pdf', { method: 'POST', body: fd })
    const { pageCount: count, suggestions } = await res.json()

    setPageCount(count)
    setMappings(Array.from({ length: count }, (_, i) => ({
      pageIndex: i,
      employeeId: suggestions?.[i]?.employeeId ?? '',
    })))
    setStep('map')
    setLoading(false)
  }

  function setEmployeeId(pageIndex: number, empId: string) {
    setMappings(prev => prev.map(m => m.pageIndex === pageIndex ? { ...m, employeeId: empId } : m))
  }

  const assignedIds = mappings.map(m => m.employeeId).filter(Boolean)
  const assignedMappings = mappings.filter(m => m.employeeId)
  const allMapped = mappings.length > 0 && mappings.every(m => m.employeeId)

  // 업로드 (알림톡 없이) - 배정된 페이지만 업로드
  async function handleUpload() {
    if (!file || assignedMappings.length === 0) return
    setLoading(true)
    setLoadingMsg('PDF 분리 업로드 중...')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('pay_year', payYear)
    fd.append('pay_month', payMonth)
    fd.append('mappings', JSON.stringify(assignedMappings))

    const res = await fetch('/api/admin/split-upload', { method: 'POST', body: fd })
    const json = await res.json()

    const uploadResults: UploadResult[] = json.results ?? []
    setResults(uploadResults)

    // 성공한 직원만 기본 전체 선택
    const successIds = new Set(
      uploadResults.filter(r => r.success && r.payslipId).map(r => r.payslipId!)
    )
    setSelectedIds(successIds)
    setStep('confirm')
    setLoading(false)
  }

  // 알림톡 발송
  async function handleNotify() {
    if (selectedIds.size === 0) return
    setLoading(true)
    setLoadingMsg('알림톡 발송 중...')

    const res = await fetch('/api/admin/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payslipIds: Array.from(selectedIds),
        payYear: parseInt(payYear),
        payMonth: parseInt(payMonth),
      }),
    })
    const json = await res.json()

    // 결과 병합
    const notifyMap = new Map(json.results?.map((r: { payslipId: string; success: boolean; error?: string }) => [r.payslipId, r]))
    setResults(prev => prev.map(r => {
      if (!r.payslipId) return r
      const n = notifyMap.get(r.payslipId) as { success: boolean; error?: string } | undefined
      if (!n) return r
      return { ...r, notified: n.success, notifyError: n.error }
    }))
    setStep('done')
    setLoading(false)
  }

  function toggleSelect(payslipId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(payslipId) ? next.delete(payslipId) : next.add(payslipId)
      return next
    })
  }

  const successResults = results.filter(r => r.success && r.payslipId)
  const allSelected = successResults.length > 0 && successResults.every(r => selectedIds.has(r.payslipId!))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(successResults.map(r => r.payslipId!)))
    }
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
        {(step === 'select' || step === 'map') && (
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
            {loading && <p className="text-xs text-blue-600 mt-2">{loadingMsg}</p>}
            {pageCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">총 <strong>{pageCount}페이지</strong> 감지됨</p>
            )}
          </div>
        )}

        {/* STEP 2: 페이지-직원 매핑 */}
        {step === 'map' && (
          <>
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

            <button
              onClick={handleUpload}
              disabled={loading || assignedMappings.length === 0}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? loadingMsg : `${assignedMappings.length}명 PDF 업로드${!allMapped ? ` (${mappings.length - assignedMappings.length}페이지 건너뜀)` : ''}`}
            </button>
          </>
        )}

        {/* STEP 3: 업로드 결과 확인 + 알림톡 발송 선택 */}
        {(step === 'confirm' || step === 'done') && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                업로드 결과 ({results.filter(r => r.success).length}/{results.length}명 성공)
              </p>
              {step === 'confirm' && successResults.length > 0 && (
                <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
                  {allSelected ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  {/* 체크박스 (성공한 경우만, 발송 전) */}
                  {step === 'confirm' && r.success && r.payslipId ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.payslipId)}
                      onChange={() => toggleSelect(r.payslipId!)}
                      className="w-4 h-4 rounded"
                    />
                  ) : (
                    <div className="w-4" />
                  )}

                  <span className="flex-1 text-sm text-gray-700">{r.employeeName ?? r.employeeId}</span>

                  <div className="text-xs text-right">
                    {!r.success && <span className="text-red-500">업로드 실패: {r.error}</span>}
                    {r.success && step === 'confirm' && <span className="text-green-600">✓ 업로드 완료</span>}
                    {r.success && step === 'done' && r.notified === undefined && <span className="text-gray-400">발송 안 함</span>}
                    {r.notified === true && <span className="text-green-600">✓ 발송 완료</span>}
                    {r.notified === false && <span className="text-red-500">발송 실패: {r.notifyError}</span>}
                  </div>
                </div>
              ))}
            </div>

            {step === 'confirm' && (
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={handleNotify}
                  disabled={loading || selectedIds.size === 0}
                  className="flex-1 bg-yellow-400 text-gray-900 py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-500 disabled:opacity-50"
                >
                  {loading ? loadingMsg : `선택한 ${selectedIds.size}명에게 알림톡 발송`}
                </button>
                <button
                  onClick={() => setStep('done')}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  발송 안 함
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => { setStep('select'); setFile(null); setPageCount(0); setMappings([]); setResults([]) }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  다시 업로드
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
