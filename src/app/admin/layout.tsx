'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'

  if (isLogin) return <>{children}</>

  const isPayslipSection = pathname.startsWith('/admin/upload') || pathname.startsWith('/admin/payslips')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        {/* 1단계: 최상위 메뉴 3개 */}
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/admin/employees"
              className={`text-sm font-semibold ${
                pathname.startsWith('/admin/employees') ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              직원관리
            </Link>
            <Link
              href="/admin/upload"
              className={`text-sm font-semibold ${
                isPayslipSection ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              급여명세서관리
            </Link>
            <Link
              href="/admin/leave"
              className={`text-sm font-semibold ${
                pathname.startsWith('/admin/leave') ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              연차관리
            </Link>
          </div>
          <LogoutButton />
        </div>

        {/* 2단계: 급여명세서관리 하위 메뉴 */}
        {isPayslipSection && (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 h-10 flex items-center gap-6">
              <Link
                href="/admin/upload"
                className={`text-sm ${
                  pathname.startsWith('/admin/upload')
                    ? 'text-emerald-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                명세서 업로드
              </Link>
              <Link
                href="/admin/payslips"
                className={`text-sm ${
                  pathname.startsWith('/admin/payslips')
                    ? 'text-emerald-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                발송 현황
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
