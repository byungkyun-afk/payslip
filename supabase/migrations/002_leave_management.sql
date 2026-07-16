-- ============================================================
-- 연차휴가 관리 테이블
-- AWS RDS PostgreSQL에서 psql 또는 DB 클라이언트로 실행하세요
-- ============================================================

-- 0. updated_at 자동 갱신 함수 (없으면 생성)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. employees 테이블에 컬럼 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS hire_date       DATE,
  ADD COLUMN IF NOT EXISTS is_approver     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS employee_token  UUID DEFAULT gen_random_uuid() UNIQUE;

-- 기존 직원에게 employee_token 채우기 (NULL인 경우)
UPDATE employees SET employee_token = gen_random_uuid() WHERE employee_token IS NULL;

-- 2. 연차 신청 테이블
CREATE TABLE IF NOT EXISTS leave_requests (
  id           SERIAL PRIMARY KEY,
  employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  leave_type   VARCHAR(10) NOT NULL CHECK (leave_type IN ('annual', 'hourly')),

  start_date   DATE NOT NULL,
  end_date     DATE,

  start_hour   SMALLINT,
  end_hour     SMALLINT,

  used_days    NUMERIC(4,2) NOT NULL DEFAULT 0,

  reason       TEXT,

  status       VARCHAR(20) DEFAULT 'pending'
               CHECK (status IN ('pending', 'level1_approved', 'approved', 'rejected')),

  rejected_reason TEXT,

  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. 결재 이력 테이블
CREATE TABLE IF NOT EXISTS leave_approvals (
  id              SERIAL PRIMARY KEY,
  request_id      INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id     INTEGER REFERENCES employees(id),
  approval_level  SMALLINT NOT NULL,
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

-- 5. updated_at 트리거
CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
