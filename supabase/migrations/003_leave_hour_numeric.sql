-- start_hour, end_hour를 30분 단위 지원을 위해 NUMERIC(4,1)로 변경
ALTER TABLE leave_requests
  ALTER COLUMN start_hour TYPE NUMERIC(4,1),
  ALTER COLUMN end_hour   TYPE NUMERIC(4,1);
