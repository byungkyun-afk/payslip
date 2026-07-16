export interface Employee {
  id: string
  name: string
  phone: string
  id_prefix: string
  department?: string
  position?: string
  hire_date?: string
  is_approver: boolean
  employee_token?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LeaveStatus = 'pending' | 'level1_approved' | 'approved' | 'rejected'
export type LeaveType = 'annual' | 'hourly'

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date?: string
  start_hour?: number
  end_hour?: number
  used_days: number
  reason?: string
  status: LeaveStatus
  rejected_reason?: string
  created_at: string
  updated_at: string
  employee?: Employee
  approvals?: LeaveApproval[]
}

export interface LeaveApproval {
  id: string
  request_id: string
  approver_id?: string
  approval_level: 1 | 2
  action: 'approve' | 'reject'
  comment?: string
  created_at: string
  approver?: Employee
}

export interface LeaveBalance {
  total_days: number
  used_days: number
  pending_days: number
  remaining_days: number
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
  employee?: Employee
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}
