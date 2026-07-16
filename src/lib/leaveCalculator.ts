/**
 * 근로기준법 기준 연차 발생 계산
 *
 * - 1년 미만: 1개월 개근 시 1일 발생 (최대 11일)
 * - 1년 이상: 15일 기본, 2년마다 1일 추가, 최대 25일
 */

/**
 * 특정 연도의 연차 부여일수 계산
 * @param hireDateStr 입사일 (YYYY-MM-DD)
 * @param targetYear  계산 대상 연도 (예: 2025)
 */
export function calculateAnnualLeave(hireDateStr: string, targetYear: number): number {
  const hireDate = new Date(hireDateStr)
  hireDate.setHours(0, 0, 0, 0)

  // targetYear 1월 1일 기준 근속연수 계산
  const periodStart = new Date(targetYear, 0, 1)

  // 아직 입사하지 않은 경우
  if (hireDate >= new Date(targetYear + 1, 0, 1)) return 0

  // 근속 개월 수 (입사일~해당연도 1월 1일)
  const yearsOfService = yearsBetween(hireDate, periodStart)
  const monthsOfService = monthsBetween(hireDate, periodStart)

  if (yearsOfService < 1) {
    // 1년 미만: 개근 월수 = 연차 일수 (최대 11일)
    // 입사 연도면 해당 연도 내 근무 개월 수
    const monthsInYear = monthsBetween(
      hireDate,
      new Date(Math.min(new Date(targetYear + 1, 0, 1).getTime(), new Date().getTime()))
    )
    return Math.min(monthsInYear, 11)
  }

  // 1년 이상: 15일 + (근속연수-1)//2 일
  const extraDays = Math.floor((yearsOfService - 1) / 2)
  return Math.min(15 + extraDays, 25)
}

function yearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear()
  const m = to.getMonth() - from.getMonth()
  if (m < 0 || (m === 0 && to.getDate() < from.getDate())) {
    years--
  }
  return Math.max(0, years)
}

function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12
  months += to.getMonth() - from.getMonth()
  if (to.getDate() < from.getDate()) months--
  return Math.max(0, months)
}

/**
 * 두 날짜 사이 평일(월~금) 수 계산
 */
export function countWorkdays(startStr: string, endStr: string): number {
  const start = new Date(startStr)
  const end = new Date(endStr)
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/**
 * 시간 단위 연차를 일 단위로 환산 (8시간 = 1일)
 */
export function hoursTodays(hours: number): number {
  return Math.round((hours / 8) * 100) / 100
}
