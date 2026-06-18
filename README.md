# Payslip — 급여명세서 보안 열람 시스템

## 시스템 흐름

```
관리자 → PDF 업로드 + 알림톡 발송
직원   → 토큰 URL 접속 → 주민번호 앞6자리 인증 → PDF 열람/다운로드
```

## 기술 스택

- **Frontend/Backend**: Next.js 15 + TypeScript + Tailwind CSS
- **DB**: Supabase (jumpwarranty 프로젝트 재사용)
- **파일 저장**: Cloudinary (PDF)
- **알림**: CoolSMS 카카오 알림톡
- **배포**: Vercel

---

## 1단계: 로컬 설정

### 환경변수
```bash
cp .env.local.example .env.local
# .env.local 파일에 실제 값 입력
```

### 개발 서버 실행
```bash
npm install
npm run dev
```

---

## 2단계: Supabase 테이블 생성

1. [Supabase Dashboard](https://app.supabase.com) → jumpwarranty 프로젝트 선택
2. **SQL Editor** 탭 클릭
3. `supabase/migrations/001_create_payslip_tables.sql` 파일 내용 전체 복사 후 실행
4. `employees`, `payslips` 테이블 생성 확인

### 테이블 구조

**employees**
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | VARCHAR(50) | 직원 이름 |
| phone | VARCHAR(20) | 전화번호 (알림톡) |
| id_prefix | VARCHAR(6) | 주민번호 앞6자리 (인증용) |
| department | VARCHAR(100) | 부서 |
| position | VARCHAR(100) | 직급 |
| is_active | BOOLEAN | 재직 여부 |

**payslips**
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| employee_id | UUID | FK → employees |
| pay_year | SMALLINT | 급여 연도 |
| pay_month | SMALLINT | 급여 월 |
| cloudinary_id | TEXT | Cloudinary public_id |
| access_token | UUID | URL 토큰 (고유) |
| token_expires_at | TIMESTAMPTZ | 토큰 만료 (기본 30일) |
| is_notified | BOOLEAN | 알림톡 발송 여부 |

---

## 3단계: GitHub 연결

```bash
git init
git add .
git commit -m "init: payslip 프로젝트 초기 설정"

# GitHub에서 새 repo 생성 후
git remote add origin https://github.com/YOUR_USERNAME/payslip.git
git branch -M main
git push -u origin main
```

---

## 4단계: Vercel 배포

1. [Vercel](https://vercel.com) → **Add New Project** → GitHub repo `payslip` 선택
2. **Environment Variables**에 `.env.local.example` 변수 모두 입력
3. **Deploy** 클릭

---

## 다음 단계 (2단계 개발)

- [ ] 관리자 페이지: 직원 관리 CRUD
- [ ] 관리자 페이지: PDF 업로드 + 알림톡 발송
- [ ] 직원 열람 페이지: 토큰 인증 + PDF 뷰어
- [ ] API Routes: `/api/admin/*`, `/api/payslip/[token]`
