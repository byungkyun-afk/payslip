'use client'

import { useState, useEffect } from 'react'
import { Employee } from '@/types'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', id_prefix: '', department: '', position: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    setLoading(true)
    const res = await fetch('/api/admin/employees')
    const { data } = await res.json()
    setEmployees(data?.filter((e: Employee) => e.is_active) ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditTarget(null)
    setForm({ name: '', phone: '', id_prefix: '', department: '', position: '' })
    setShowForm(true)
    setError('')
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp)
    setForm({ name: emp.name, phone: emp.phone, id_prefix: emp.id_prefix, department: emp.department ?? '', position: emp.position ?? '' })
    setShowForm(true)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = editTarget ? `/api/admin/employees/${editTarget.id}` : '/api/admin/employees'
    const method = editTarget ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error)
    } else {
      setShowForm(false)
      fetchEmployees()
    }
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 직원을 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' })
    fetchEmployees()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
        <button onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer">
          + 직원 추가
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['이름', '전화번호', '부서', '직급', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">등록된 직원이 없습니다.</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.department ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.position ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(emp)}
                        className="text-blue-600 hover:underline text-xs cursor-pointer">수정</button>
                      <button onClick={() => handleDelete(emp.id, emp.name)}
                        className="text-red-500 hover:underline text-xs cursor-pointer">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 직원 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editTarget ? '직원 수정' : '직원 추가'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: '이름 *', key: 'name', placeholder: '홍길동' },
                { label: '전화번호 *', key: 'phone', placeholder: '01012345678' },
                { label: '주민번호 앞 6자리 *', key: 'id_prefix', placeholder: '900101' },
                { label: '부서', key: 'department', placeholder: '개발팀' },
                { label: '직급', key: 'position', placeholder: '선임' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={label.includes('*')}
                  />
                </div>
              ))}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  취소
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
