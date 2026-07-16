/**
 * 근로기준법 기준 연차 발생 계산
 *
 * - 1년 미만: 1개월 개근 시 1일 발생 (최대 11일)
 * - 1년 이상: 15일 기본, 2년마다 1일 추가, 최대 25일
 *
 * 계산 기준: 해당 연도 내 도래하는 입사 기념일의 근속연수
 */

export function calculateAnnualLeave(hireDateStr: string, targetYear: number): number {
  const hireDate = new Date(hireDateStr)
  hireDate.setHours(0, 0, 0, 0)

  const hireYear = hireDate.getFullYear()

  // 해당 연도에 아직 입사 전이면 0
  if (hireYear > targetYear) return 0

  // 해당 연도의 입사 기념일 기준 근속연수
  const yearsOfService = targetYear - hireYear

  if (yearsOfService === 0) {
    // 입사 첫 해: 월 1일씩 (최대 11일)
    const today = new Date()
    const endOfTargetYear = new Date(targetYear + 1, 0, 1)
    const calcTo = today < endOfTargetYear ? today : endOfTargetYear
    return Math.min(monthsBetween(hireDate, calcTo), 11)
  }

  // 1년 이상: 15일 + 2년마다 1일 추가 (최대 25일)
  const extraDays = Math.floor((yearsOfService - 1) / 2)
  return Math.min(15 + extraDays, 25)
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
