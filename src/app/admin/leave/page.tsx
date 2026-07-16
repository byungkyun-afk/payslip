'use client'

import { useState, useEffect } from 'react'
import { LeaveRequest } from '@/types'

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
  position?: string
  hire_date?: string
  total_days: number
  used_days: number
  pending_days: number
  remaining_days: number
}

type TabType = 'requests' | 'stats'

export default function AdminLeavePage() {
  const [tab, setTab] = useState<TabType>('requests')
  const [requests, setRequests] = useState<(LeaveRequest & { employee_name: string })[]>([])
  const [stats, setStats] = useState<StatRow[]>([])
  const [loading, setLoading] = useState(true)

  const [actionTarget, setActionTarget] = useState<(LeaveRequest & { employee_name: string }) | null>(null)
  const [actionType, setActionType] = useState<'approve1' | 'approve2' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [rejectedReason, setRejectedReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => { fetchData() }, [tab])

  async function fetchData() {
    setLoading(true)
    if (tab === 'requests') {
      const res = await fetch('/api/admin/leave')
      const { data } = await res.json()
      setRequests(data ?? [])
    } else {
      const res = await fetch('/api/admin/leave/stats')
      const { data } = await res.json()
      setStats(data ?? [])
    }
    setLoading(false)
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
      setActionTarget(null)
      setActionType(null)
      setComment('')
      setRejectedReason('')
      fetchData()
    }
    setActionLoading(false)
  }

  function formatLeaveDetail(req: LeaveRequest) {
    if (req.leave_type === 'annual') {
      const s = new Date(req.start_date).toLocaleDateString('ko-KR')
      const e = req.end_date ? new Date(req.end_date).toLocaleDateString('ko-KR') : s
      return s === e ? s : `${s} ~ ${e}`
    }
    return `${new Date(req.start_date).toLocaleDateString('ko-KR')} ${req.start_hour}:00~${req.end_hour}:00`
  }

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">연차 관리</h1>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setTab('requests')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'requests' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            신청 목록
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'stats' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            사용현황
          </button>
        </div>
      </div>

      {/* ── 신청 목록 탭 ── */}
      {tab === 'requests' && (
        <>
          {/* 상태 필터 */}
          <div className="flex gap-2 mb-4">
            {[['all', '전체'], ['pending', '대기'], ['level1_approved', '1차 승인'], ['approved', '최종 승인'], ['rejected', '반려']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === val
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">불러오는 중...</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['직원', '유형', '기간/시간', '사용일수', '사유', '상태', '결재'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">신청 내역이 없습니다.</td>
                    </tr>
                  ) : filtered.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{req.employee_name}</p>
                        <p className="text-xs text-gray-400">{(req as never as { department?: string }).department}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {req.leave_type === 'annual' ? '연차' : '시간연차'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatLeaveDetail(req)}</td>
                      <td className="px-4 py-3 text-gray-600">{req.used_days}일</td>
                      <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{req.reason ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[req.status]}`}>
                          {STATUS_LABEL[req.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => { setActionTarget(req); setActionType('approve1') }}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                              >
                                1차 승인
                              </button>
                              <button
                                onClick={() => { setActionTarget(req); setActionType('reject') }}
                                className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                              >
                                반려
                              </button>
                            </>
                          )}
                          {req.status === 'level1_approved' && (
                            <>
                              <button
                                onClick={() => { setActionTarget(req); setActionType('approve2') }}
                                className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                              >
                                최종 승인
                              </button>
                              <button
                                onClick={() => { setActionTarget(req); setActionType('reject') }}
                                className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                              >
                                반려
                              </button>
                            </>
                          )}
                          {(req.status === 'approved' || req.status === 'rejected') && (
                            <span className="text-xs text-gray-300">처리 완료</span>
                          )}
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

      {/* ── 사용현황 탭 ── */}
      {tab === 'stats' && (
        loading ? (
          <p className="text-gray-500 text-sm">불러오는 중...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['직원', '입사일', '총 연차', '사용', '대기', '잔여'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">직원 정보가 없습니다.</td>
                  </tr>
                ) : stats.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.department}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.hire_date ? new Date(s.hire_date).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium">{s.total_days}일</td>
                    <td className="px-4 py-3 text-blue-600">{s.used_days}일</td>
                    <td className="px-4 py-3 text-yellow-600">{s.pending_days}일</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${s.remaining_days <= 3 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {s.remaining_days}일
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* 결재 확인 모달 */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-1">
              {actionType === 'approve1' ? '1차 승인' : actionType === 'approve2' ? '최종 승인' : '반려'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {actionTarget.employee_name}님의 연차 신청 ({formatLeaveDetail(actionTarget)})
            </p>

            {actionType === 'reject' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">반려 사유</label>
                <textarea
                  value={rejectedReason}
                  onChange={e => setRejectedReason(e.target.value)}
                  placeholder="반려 사유를 입력하세요"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">코멘트 (선택)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="코멘트를 입력하세요"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setActionTarget(null); setActionType(null); setComment(''); setRejectedReason('') }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {actionLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
