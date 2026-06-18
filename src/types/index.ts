export interface Employee {
  id: string
  name: string
  phone: string
  id_prefix: string       // 주민번호 앞6자리 (인증용)
  department?: string
  position?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Payslip {
  id: string
  employee_id: string
  pay_year: number
  pay_month: number
  cloudinary_id: string
  access_token: string
  token_expires_at: string
  is_notified: boolean
  notified_at?: string
  downloaded_at?: string
  created_at: string
  updated_at: string
  // JOIN
  employee?: Employee
}

// API 응답 타입
export interface ApiResponse<T> {
  data?: T
  error?: string
}
