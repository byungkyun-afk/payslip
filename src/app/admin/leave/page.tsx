'use client'

import { useState, useEffect } from 'react'
import { LeaveRequest, LeaveType } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
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

interface StatRow {
  id: string
  name: string
  department?: string
  hire_date?: string
  total_days: number
  used_days: number
  pending_days: number
  remaining_days: number
}
interface Employee { id: string; name: string; department?: string }
type TabType = 'requests' | 'stats'

const YEAR = new Date().getFullYear()
const YEARS = [YEAR, YEAR - 1, YEAR - 2]
const D_YEARS = [YEAR, YEAR - 1, YEAR - 2, YEAR - 3]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }

function DateSelects({ value, onChange, min }: {
  value: string
  onChange: (v: string) => void
  min?: string
}) {
  const [y, m, d] = value ? value.split('-').map(Number) : [YEAR, 1, 1]
  const days = Array.from({ length: daysInMonth(y || YEAR, m || 1) }, (_, i) => i + 1)
  function set(ny: number, nm: number, nd: number) {
    const maxD = daysInMonth(ny, nm)
    const safeD = Math.min(nd, maxD)
    onChange(`${ny}-${String(nm).padStart(2,'0')}-${String(safeD).padStart(2,'0')}`)
  }
  return (
    <div className="flex gap-2">
      <select value={y || ''} onChange={e => set(Number(e.target.value), m||1, d||1)}
        className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" required>
        <option value="">년</option>
        {D_YEARS.map(yr => <option key={yr} value={yr}>{yr}년</option>)}
      </select>
      <select value={m || ''} onChange={e => set(y||YEAR, Number(e.target.value), d||1)}
        className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" required>
        <option value="">월</option>
        {MONTHS.map(mo => <option key={mo} value={mo}>{mo}월</option>)}
      </select>
      <select value={d || ''} onChange={e => set(y||YEAR, m||1, Number(e.target.value))}
        className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" required>
        <option value="">일</option>
        {days.map(dy => <option key={dy} value={dy}>{dy}일</option>)}
      </select>
    </div>
  )
}

export default function AdminLeavePage() {
  const [tab, setTab] = useState<TabType>('requests')
  const [year, setYear] = useState(YEAR)
  const [requests, setRequests] = useState<(LeaveRequest & { employee_name: string; department?: string })[]>([])
  const [stats, setStats] = useState<StatRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // 결재 모달
  const [actionTarget, setActionTarget] = useState<(LeaveRequest & { employee_name: string }) | null>(null)
  const [actionType, setActionType] = useState<'approve1' | 'approve2' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [rejectedReason, setRejectedReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // 직원 상세 모달
  const [detailEmployee, setDetailEmployee] = useState<StatRow | null>(null)
  const [detailRecords, setDetailRecords] = useState<LeaveRequest[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailYear, setDetailYear] = useState(YEAR)

  // 직접 입력 모달
  const [showDirect, setShowDirect] = useState(false)
  const [directForm, setDirectForm] = useState({
    employee_id: '', leave_type: 'annual' as LeaveType,
    start_date: '', end_date: '', start_hour: 9, end_hour: 13, reason: '',
  })
  const [directLoading, setDirectLoading] = useState(false)
  const [directError, setDirectError] = useState('')

  // 수정 모달
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null)
  const [editForm, setEditForm] = useState({
    leave_type: 'annual' as LeaveType,
    start_date: '', end_date: '', start_hour: 9, end_hour: 13, reason: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { fetchData() }, [tab, year])
  useEffect(() => { fetchEmployees() }, [])

  async function fetchData() {
    setLoading(true)
    if (tab === 'requests') {
      const res = await fetch(`/api/admin/leave?year=${year}`)
      const { data } = await res.json()
      setRequests(data ?? [])
    } else {
      const res = await fetch(`/api/admin/leave/stats?year=${year}`)
      const { data } = await res.json()
      setStats(data ?? [])
    }
    setLoading(false)
  }

  async function fetchEmployees() {
    const res = await fetch('/api/admin/employees')
    const { data } = await res.json()
    setEmployees(data ?? [])
  }

  async function openDetail(emp: StatRow) {
    setDetailEmployee(emp)
    setDetailYear(year)
    setDetailLoading(true)
    const res = await fetch(`/api/admin/leave/employee/${emp.id}?year=${year}`)
    const { data } = await res.json()
    setDetailRecords(data ?? [])
    setDetailLoading(false)
  }

  async function refreshDetail(empId: string, y: number) {
    setDetailLoading(true)
    const res = await fetch(`/api/admin/leave/employee/${empId}?year=${y}`)
    const { data } = await res.json()
    setDetailRecords(data ?? [])
    setDetailLoading(false)
  }

  async function handleAction() {
    if (!actionTarget || !actionType) return
    setActionLoading(true)
    const level = actionType === 'approve1' ? 1 : 2
    const action = actionType === 'reject' ? 'reject' : 'approve'
    const res = await fetch(`/api/admin/leave/${actionTarget.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, level, comment, rejected_reason: rejectedReason }),
    })
    if (res.ok) {
      setActionTarget(null); setActionType(null); setComment(''); setRejectedReason('')
      fetchData()
    }
    setActionLoading(false)
  }

  async function handleDirectSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDirectLoading(true); setDirectError('')
    const body = {
      ...directForm,
      end_date: directForm.leave_type === 'annual' ? directForm.end_date : undefined,
      start_hour: directForm.leave_type === 'hourly' ? directForm.start_hour : undefined,
      end_hour: directForm.leave_type === 'hourly' ? directForm.end_hour : undefined,
    }
    const res = await fetch('/api/admin/leave/direct', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      setShowDirect(false)
      setDirectForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', start_hour: 9, end_hour: 13, reason: '' })
      fetchData()
    } else {
      setDirectError(json.error)
    }
    setDirectLoading(false)
  }

  function openEdit(req: LeaveRequest) {
    setEditTarget(req)
    setEditForm({
      leave_type: req.leave_type,
      start_date: req.start_date ? req.start_date.slice(0, 10) : '',
      end_date: req.end_date ? req.end_date.slice(0, 10) : '',
      start_hour: req.start_hour ?? 9,
      end_hour: req.end_hour ?? 13,
      reason: req.reason ?? '',
    })
    setEditError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditLoading(true); setEditError('')
    const body = {
      ...editForm,
      end_date: editForm.leave_type === 'annual' ? editForm.end_date : undefined,
      start_hour: editForm.leave_type === 'hourly' ? editForm.start_hour : undefined,
      end_hour: editForm.leave_type === 'hourly' ? editForm.end_hour : undefined,
    }
    const res = await fetch(`/api/admin/leave/${editTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      setEditTarget(null)
      fetchData()
      if (detailEmployee) refreshDetail(detailEmployee.id, detailYear)
    } else {
      setEditError(json.error)
    }
    setEditLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('이 연차 내역을 삭제하시겠습니까?')) return
    await fetch(`/api/admin/leave/${id}`, { method: 'DELETE' })
    fetchData()
    if (detailEmployee) refreshDetail(detailEmployee.id, detailYear)
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }
  function fmtDetail(req: LeaveRequest) {
    if (req.leave_type === 'annual') {
      const s = fmt(req.start_date)
      const e = req.end_date ? fmt(req.end_date) : s
      return s === e ? s : `${s} ~ ${e}`
    }
    return `${fmt(req.start_date)} ${req.start_hour}:00~${req.end_hour}:00`
  }

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)
  const rawHours = directForm.end_hour - directForm.start_hour
  const lunchDeduct = directForm.start_hour < 13 && directForm.end_hour > 12 ? 1 : 0
  const hours = Math.max(0, rawHours - lunchDeduct)

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">연차 관리</h1>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowDirect(true); setDirectError('') }}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            + 직접 입력
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {(['requests', 'stats'] as TabType[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'requests' ? '신청 목록' : '사용현황'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 신청 목록 탭 */}
      {tab === 'requests' && (
        <>
          <div className="flex gap-2 mb-4">
            {[['all','전체'],['pending','대기'],['level1_approved','1차 승인'],['approved','최종 승인'],['rejected','반려']].map(([val,label]) => (
              <button key={val} onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === val ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>{label}</button>
            ))}
          </div>
          {loading ? <p className="text-gray-500 text-sm">불러오는 중...</p> : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['직원','유형','기간/시간','사용일수','사유','상태','결재'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">신청 내역이 없습니다.</td></tr>
                  ) : filtered.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{req.employee_name}</p>
                        <p className="text-xs text-gray-400">{req.department}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{req.leave_type === 'annual' ? '연차' : '시간연차'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDetail(req)}</td>
                      <td className="px-4 py-3 text-gray-600">{req.used_days}일</td>
                      <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{req.reason ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[req.status]}`}>
                          {STATUS_LABEL[req.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {req.status === 'pending' && (<>
                            <button onClick={() => { setActionTarget(req); setActionType('approve1') }}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">1차 승인</button>
                            <button onClick={() => { setActionTarget(req); setActionType('reject') }}
                              className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">반려</button>
                          </>)}
                          {req.status === 'level1_approved' && (<>
                            <button onClick={() => { setActionTarget(req); setActionType('approve2') }}
                              className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">최종 승인</button>
                            <button onClick={() => { setActionTarget(req); setActionType('reject') }}
                              className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">반려</button>
                          </>)}
                          {(req.status === 'approved' || req.status === 'rejected') && (
                            <span className="text-xs text-gray-300">처리 완료</span>
                          )}
                          <button onClick={() => openEdit(req)}
                            className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100">수정</button>
                          <button onClick={() => handleDelete(String(req.id))}
                            className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 사용현황 탭 */}
      {tab === 'stats' && (
        loading ? <p className="text-gray-500 text-sm">불러오는 중...</p> : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['직원','입사일','총 연차','사용','대기','잔여',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">직원 정보가 없습니다.</td></tr>
                ) : stats.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.department}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.hire_date ? fmt(s.hire_date) : '-'}</td>
                    <td className="px-4 py-3 font-medium">{s.total_days}일</td>
                    <td className="px-4 py-3 text-blue-600">{s.used_days}일</td>
                    <td className="px-4 py-3 text-yellow-600">{s.pending_days}일</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${s.remaining_days <= 3 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {s.remaining_days}일
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(s)}
                        className="text-xs text-blue-600 hover:underline">상세보기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* 직원 상세 내역 모달 */}
      {detailEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{detailEmployee.name} 연차 내역</h2>
                <p className="text-sm text-gray-500">{detailEmployee.department} · 총 {detailEmployee.total_days}일 중 {detailEmployee.used_days}일 사용</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={detailYear}
                  onChange={e => { setDetailYear(Number(e.target.value)); refreshDetail(detailEmployee.id, Number(e.target.value)) }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <button onClick={() => setDetailEmployee(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {detailLoading ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">불러오는 중...</p>
              ) : detailRecords.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">내역이 없습니다.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                    <tr>{['유형','날짜/시간','사용일수','사유','상태'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detailRecords.map((req, i) => (
                      <tr key={req.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 text-gray-600">{req.leave_type === 'annual' ? '연차' : '시간연차'}</td>
                        <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{fmtDetail(req)}</td>
                        <td className="px-4 py-3 text-gray-600">{req.used_days}일</td>
                        <td className="px-4 py-3 text-gray-500 max-w-40 truncate">{req.reason ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[req.status]}`}>
                            {STATUS_LABEL[req.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setDetailEmployee(null); openEdit(req) }}
                              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100">수정</button>
                            <button onClick={() => handleDelete(String(req.id))}
                              className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-medium text-gray-700">합계 (승인된 항목)</td>
                      <td className="px-4 py-3 font-bold text-blue-600">
                        {detailRecords
                          .filter(r => r.status === 'approved' || r.status === 'level1_approved')
                          .reduce((sum, r) => sum + Number(r.used_days), 0)
                          .toFixed(2).replace(/\.00$/, '')}일
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 결재 확인 모달 */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-1">
              {actionType === 'approve1' ? '1차 승인' : actionType === 'approve2' ? '최종 승인' : '반려'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{actionTarget.employee_name}님 ({fmtDetail(actionTarget)})</p>
            {actionType === 'reject' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">반려 사유</label>
                <textarea value={rejectedReason} onChange={e => setRejectedReason(e.target.value)}
                  rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">코멘트 (선택)</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setActionTarget(null); setActionType(null); setComment(''); setRejectedReason('') }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">취소</button>
              <button onClick={handleAction} disabled={actionLoading}
                className={`flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {actionLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">연차 내역 수정</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
                <div className="flex gap-3">
                  {([['annual','연차 (하루 단위)'],['hourly','시간 연차']] as const).map(([val,label]) => (
                    <button key={val} type="button" onClick={() => setEditForm(f => ({ ...f, leave_type: val }))}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        editForm.leave_type === val ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editForm.leave_type === 'annual' ? '시작일 *' : '날짜 *'}
                </label>
                <DateSelects value={editForm.start_date} onChange={v => setEditForm(f => ({ ...f, start_date: v, end_date: v }))} />
              </div>
              {editForm.leave_type === 'annual' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일 *</label>
                  <DateSelects value={editForm.end_date} min={editForm.start_date}
                    onChange={v => setEditForm(f => ({ ...f, end_date: v }))} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">시작 시각 *</label>
                      <select value={editForm.start_hour}
                        onChange={e => setEditForm(f => ({ ...f, start_hour: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        {Array.from({ length: 9 }, (_, i) => i + 9).map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">종료 시각 *</label>
                      <select value={editForm.end_hour}
                        onChange={e => setEditForm(f => ({ ...f, end_hour: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        {Array.from({ length: 9 }, (_, i) => i + 10).map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <textarea value={editForm.reason} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">취소</button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {editLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 직접 입력 모달 */}
      {showDirect && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">연차 직접 입력</h2>
            <form onSubmit={handleDirectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원 *</label>
                <select value={directForm.employee_id}
                  onChange={e => setDirectForm(f => ({ ...f, employee_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" required>
                  <option value="">직원 선택</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}{emp.department ? ` (${emp.department})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
                <div className="flex gap-3">
                  {([['annual','연차 (하루 단위)'],['hourly','시간 연차']] as const).map(([val,label]) => (
                    <button key={val} type="button" onClick={() => setDirectForm(f => ({ ...f, leave_type: val }))}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        directForm.leave_type === val ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {directForm.leave_type === 'annual' ? '시작일 *' : '날짜 *'}
                </label>
                <DateSelects value={directForm.start_date}
                  onChange={v => setDirectForm(f => ({ ...f, start_date: v, end_date: v }))} />
              </div>
              {directForm.leave_type === 'annual' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일 *</label>
                  <DateSelects value={directForm.end_date} min={directForm.start_date}
                    onChange={v => setDirectForm(f => ({ ...f, end_date: v }))} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">시작 시각 *</label>
                      <select value={directForm.start_hour}
                        onChange={e => setDirectForm(f => ({ ...f, start_hour: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        {Array.from({ length: 9 }, (_, i) => i + 9).map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">종료 시각 *</label>
                      <select value={directForm.end_hour}
                        onChange={e => setDirectForm(f => ({ ...f, end_hour: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        {Array.from({ length: 9 }, (_, i) => i + 10).map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    사용량: {hours}시간 = {(hours / 8).toFixed(2)}일
                    {lunchDeduct > 0 && <span className="ml-1">(점심시간 제외)</span>}
                  </p>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <textarea value={directForm.reason} onChange={e => setDirectForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="선택 사항" rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
              {directError && <p className="text-sm text-red-600">{directError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowDirect(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                  취소
                </button>
                <button type="submit" disabled={directLoading}
                  className="flex-1 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {directLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
