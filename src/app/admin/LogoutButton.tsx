'use client'

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await fetch('/api/admin/login', { method: 'DELETE' })
        window.location.href = '/admin/login'
      }}
      className="text-sm text-gray-500 hover:text-gray-900"
    >
      로그아웃
    </button>
  )
}
