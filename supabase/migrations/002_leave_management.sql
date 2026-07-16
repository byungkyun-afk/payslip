-- ============================================================
-- 연차휴가 관리 테이블
-- AWS RDS PostgreSQL에서 psql 또는 DB 클라이언트로 실행하세요
-- ============================================================

-- 1. employees 테이블에 컬럼 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS hire_date       DATE,
  ADD COLUMN IF NOT EXISTS is_approver     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS employee_token  UUID DEFAULT gen_random_uuid() UNIQUE;

-- 기존 직원에게 employee_token 채우기 (NULL인 경우)
UPDATE employees SET employee_token = gen_random_uuid() WHERE employee_token IS NULL;

-- 2. 연차 신청 테이블
CREATE TABLE IF NOT EXISTS leave_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- 휴가 유형: annual(하루 단위), hourly(시간 단위)
  leave_type   VARCHAR(10) NOT NULL CHECK (leave_type IN ('annual', 'hourly')),

  -- 하루 단위
  start_date   DATE NOT NULL,
  end_date     DATE,          -- annual은 종료일, hourly는 NULL

  -- 시간 단위 (hourly인 경우)
  start_hour   SMALLINT,      -- 시작 시각 (9~18)
  end_hour     SMALLINT,      -- 종료 시각 (10~18)

  -- 사용량 (일 단위로 환산, 시간제는 hours/8)
  used_days    NUMERIC(4,2) NOT NULL DEFAULT 0,

  reason       TEXT,

  -- 결재 상태
  -- pending → level1_approved → approved
  -- pending → rejected (어느 단계에서든 반려 가능)
  status       VARCHAR(20) DEFAULT 'pending'
               CHECK (status IN ('pending', 'level1_approved', 'approved', 'rejected')),

  rejected_reason TEXT,

  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. 결재 이력 테이블
CREATE TABLE IF NOT EXISTS leave_approvals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id      UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id     UUID REFERENCES employees(id),   -- NULL이면 admin
  approval_level  SMALLINT NOT NULL,               -- 1: 1차(팀장), 2: 최종(관리자)
  action          VARCHAR(10) NOT NULL CHECK (action IN ('approve', 'reject')),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status      ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date  ON leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_approvals_request_id ON leave_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_token   ON employees(employee_token);
CREATE INDEX IF NOT EXISTS idx_employees_is_approver      ON employees(is_approver);

-- 5. updated_at 트리거 (update_updated_at 함수는 001 마이그레이션에서 이미 생성됨)
CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
