'use client'

import { useState, use, useEffect } from 'react'
import { LeaveRequest, LeaveBalance, LeaveType } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  pending: '결재 대기',
  level1_approved: '1차 승인',
  approved: '최종 승인',
  rejected: '반려',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  level1_approved: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

interface EmployeeInfo {
  id: string
  name: string
  department?: string
  position?: string
  hire_date?: string
}

export default function LeavePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  // 인증 상태
  const [idPrefix, setIdPrefix] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)

  // 데이터
  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]

  // 신청 폼
  const [showForm, setShowForm] = useState(false)
  const [leaveType, setLeaveType] = useState<LeaveType>('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(13)
  const [reason, setReason] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const res = await fetch(`/api/employee/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_prefix: idPrefix }),
    })
    const json = await res.json()
    if (res.ok) {
      setEmployee(json)
    } else {
      setAuthError(json.error)
    }
    setAuthLoading(false)
  }

  async function fetchLeaveData(year?: number) {
    if (!employee) return
    setDataLoading(true)
    const y = year ?? selectedYear
    const res = await fetch(`/api/employee/${token}/leave?year=${y}`)
    const json = await res.json()
    if (res.ok) {
      setBalance(json.balance)
      setRequests(json.requests)
    }
    setDataLoading(false)
  }

  useEffect(() => {
    if (employee) fetchLeaveData()
  }, [employee, selectedYear])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitLoading(true)
    setSubmitError('')
    setSubmitSuccess(false)

    const body: Record<string, unknown> = { leave_type: leaveType, start_date: startDate, reason }
    if (leaveType === 'annual') {
      body.end_date = endDate
    } else {
      body.start_hour = startHour
      body.end_hour = endHour
    }

    const res = await fetch(`/api/employee/${token}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      setSubmitSuccess(true)
      setShowForm(false)
      setStartDate('')
      setEndDate('')
      setReason('')
      fetchLeaveData()
    } else {
      setSubmitError(json.error)
    }
    setSubmitLoading(false)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function formatLeaveDetail(req: LeaveRequest) {
    if (req.leave_type === 'annual') {
      const s = formatDate(req.start_date)
      const e = req.end_date ? formatDate(req.end_date) : s
      return s === e ? s : `${s} ~ ${e}`
    } else {
      return `${formatDate(req.start_date)} ${req.start_hour}:00 ~ ${req.end_hour}:00`
    }
  }

  // ── 인증 전 화면 ──
  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-sm">
          <div className="text-3xl mb-3">🌿</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">연차 관리</h1>
          <p className="text-sm text-gray-500 mb-6">본인 확인을 위해 주민번호 앞 6자리를 입력해주세요.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주민번호 앞 6자리</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={idPrefix}
                onChange={e => setIdPrefix(e.target.value.replace(/\D/g, ''))}
                placeholder="예) 900101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading || idPrefix.length !== 6}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {authLoading ? '확인 중...' : '확인'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const year = new Date().getFullYear()

  // ── 인증 후 메인 화면 ──
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-4">

        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {employee.name}님의 연차 현황
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {employee.department} {employee.position && `· ${employee.position}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <button
                onClick={() => { setShowForm(true); setSubmitError(''); setSubmitSuccess(false) }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                연차 신청
              </button>
            </div>
          </div>
        </div>

        {/* 연차 잔여 현황 */}
        {balance && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '총 연차', value: balance.total_days, color: 'text-gray-900' },
              { label: '사용', value: balance.used_days, color: 'text-blue-600' },
              { label: '대기', value: balance.pending_days, color: 'text-yellow-600' },
              { label: '잔여', value: balance.remaining_days, color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400">일</p>
              </div>
            ))}
          </div>
        )}

        {submitSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
            연차 신청이 완료되었습니다. 결재 후 반영됩니다.
          </div>
        )}

        {/* 신청 내역 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">신청 내역</h2>
          </div>
          {dataLoading ? (
            <p className="px-5 py-6 text-sm text-gray-400">불러오는 중...</p>
          ) : requests.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">신청 내역이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {requests.map(req => (
                <li key={req.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {req.leave_type === 'annual' ? '연차' : '시간연차'}
                        </span>
                        <span className="text-sm text-gray-500">({req.used_days}일)</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatLeaveDetail(req)}</p>
                      {req.reason && <p className="text-xs text-gray-400 mt-0.5">{req.reason}</p>}
                      {req.rejected_reason && (
                        <p className="text-xs text-red-500 mt-0.5">반려 사유: {req.rejected_reason}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLOR[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 연차 신청 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">연차 신청</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* 유형 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">휴가 유형</label>
                <div className="flex gap-3">
                  {([['annual', '연차 (하루 단위)'], ['hourly', '시간 연차']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLeaveType(val)}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        leaveType === val
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {leaveType === 'annual' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시작일 *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">종료일 *</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">시작 시각 *</label>
                      <select
                        value={startHour}
                        onChange={e => setStartHour(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {Array.from({ length: 9 }, (_, i) => i + 9).map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">종료 시각 *</label>
                      <select
                        value={endHour}
                        onChange={e => setEndHour(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {Array.from({ length: 9 }, (_, i) => i + 10).map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    사용량: {Math.max(0, endHour - startHour - (startHour < 13 && endHour > 12 ? 1 : 0))}시간
                    ({(Math.max(0, endHour - startHour - (startHour < 13 && endHour > 12 ? 1 : 0)) / 8).toFixed(2)}일)
                    {startHour < 13 && endHour > 12 && <span className="text-gray-400 ml-1">(점심시간 제외)</span>}
                  </p>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="선택 사항"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                              type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitLoading ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
