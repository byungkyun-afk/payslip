-- ============================================================
-- payslip 시스템 테이블
-- Supabase SQL Editor에서 실행하세요 (jumpwarranty 프로젝트)
-- ============================================================

-- 1. 직원 테이블
CREATE TABLE IF NOT EXISTS employees (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  phone       VARCHAR(20)  NOT NULL UNIQUE,  -- 알림톡 수신용 (010-XXXX-XXXX)
  id_prefix   VARCHAR(6)   NOT NULL,         -- 주민번호 앞6자리 (인증용, 평문 저장 - 필요시 해시 전환)
  department  VARCHAR(100),
  position    VARCHAR(100),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. 급여명세서 테이블
CREATE TABLE IF NOT EXISTS payslips (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_year        SMALLINT NOT NULL,          -- 2024
  pay_month       SMALLINT NOT NULL,          -- 12
  cloudinary_id   TEXT NOT NULL,             -- Cloudinary public_id
  access_token    UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,  -- URL 토큰
  token_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  is_notified     BOOLEAN DEFAULT false,      -- 알림톡 발송 여부
  notified_at     TIMESTAMPTZ,
  downloaded_at   TIMESTAMPTZ,               -- 최초 다운로드 시각
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(employee_id, pay_year, pay_month)   -- 동일 직원/월 중복 방지
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id   ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_access_token  ON payslips(access_token);
CREATE INDEX IF NOT EXISTS idx_payslips_pay_period    ON payslips(pay_year, pay_month);
CREATE INDEX IF NOT EXISTS idx_employees_phone        ON employees(phone);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RLS (Row Level Security) 활성화
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips  ENABLE ROW LEVEL SECURITY;

-- 서비스 Role은 모든 접근 허용 (API Routes에서 service_role key 사용)
-- 일반 anon/authenticated 사용자는 직접 접근 불가 → API를 통해서만 접근
CREATE POLICY "service_role_all_employees" ON employees
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_payslips" ON payslips
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 샘플 데이터 (테스트용 - 실제 운영 시 삭제)
-- ============================================================
-- INSERT INTO employees (name, phone, id_prefix, department, position)
-- VALUES
--   ('홍길동', '01012345678', '900101', '개발팀', '선임개발자'),
--   ('김영희', '01098765432', '850615', '디자인팀', '팀장');
