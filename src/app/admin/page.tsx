import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/employees"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <div className="text-3xl mb-3">👥</div>
          <h2 className="font-semibold text-gray-900">직원 관리</h2>
          <p className="text-sm text-gray-500 mt-1">직원 등록 및 정보 수정</p>
        </Link>
        <Link href="/admin/upload"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <div className="text-3xl mb-3">📄</div>
          <h2 className="font-semibold text-gray-900">명세서 업로드</h2>
          <p className="text-sm text-gray-500 mt-1">PDF 업로드 및 알림톡 발송</p>
        </Link>
        <Link href="/admin/payslips"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="font-semibold text-gray-900">발송 현황</h2>
          <p className="text-sm text-gray-500 mt-1">열람 여부 및 발송 기록 확인</p>
        </Link>
      </div>
    </div>
  )
}
