/**
 * 근로기준법 기준 연차 발생 계산
 *
 * - 1년 미만: 1개월 개근 시 1일 발생 (최대 11일)
 * - 1년 이상: 15일 기본, 2년마다 1일 추가, 최대 25일
 *
 * 계산 기준: 오늘 날짜 기준으로 입사 기념일(월,일 포함) 완성 여부 판단
 */

export function calculateAnnualLeave(hireDateStr: string, targetYear: number): number {
  const hireDate = new Date(hireDateStr)
  hireDate.setHours(0, 0, 0, 0)

  const hireYear = hireDate.getFullYear()
  if (hireYear > targetYear) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 해당 연도의 입사 기념일 (월, 일 포함)
  const anniversaryThisYear = new Date(targetYear, hireDate.getMonth(), hireDate.getDate())

  // 오늘 기준으로 기념일이 지났는지 확인
  const anniversaryPassed = today >= anniversaryThisYear

  // 완성된 근속연수
  let yearsOfService = targetYear - hireYear
  if (!anniversaryPassed) yearsOfService--

  if (yearsOfService <= 0) {
    // 1년 미만: 완성된 개월 수만큼 (최대 11일)
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
