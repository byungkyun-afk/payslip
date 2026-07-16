export interface Employee {
  id: string
  name: string
  phone: string
  id_prefix: string       // 주민번호 앞6자리 (인증용)
  department?: string
  position?: string
  hire_date?: string      // 입사일 (YYYY-MM-DD)
  is_approver: boolean    // 팀장(1차 결재자) 여부
  employee_token?: string // 직원 포털 접근 토큰
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
 