import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">급여명세서 관리</span>
            <Link href="/admin/employees" className="text-sm text-gray-600 hover:text-gray-900">
              직원 관리
            </Link>
            <Link href="/admin/upload" className="text-sm text-gray-600 hover:text-gray-900">
              명세서 업로드
            </Link>
            <Link href="/admin/payslips" className="text-sm text-gray-600 hover:text-gray-900">
              발송 현황
            </Link>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
