import coolsms from 'coolsms-node-sdk'

const messageService = new coolsms.default(
  process.env.COOLSMS_API_KEY!,
  process.env.COOLSMS_API_SECRET!
)

interface SendAlimtalkParams {
  to: string        // 수신자 전화번호
  employeeName: string
  payMonth: string  // 예: "2024년 12월"
  accessUrl: string // 토큰 URL
}

export async function sendPayslipAlimtalk({
  to,
  employeeName,
  payMonth,
  accessUrl,
}: SendAlimtalkParams) {
  try {
    const result = await messageService.sendOne({
      to,
      from: process.env.COOLSMS_SENDER!,
      kakaoOptions: {
        pfId: process.env.COOLSMS_KAKAO_PFID!,
        templateId: process.env.COOLSMS_KAKAO_TEMPLATE_ID!,
        variables: {
          '#{이름}': employeeName,
          '#{급여월}': payMonth,
          '#{링크}': accessUrl,
        },
      },
    })
    return { success: true, result }
  } catch (error) {
    console.error('알림톡 발송 실패:', error)
    return { success: false, error }
  }
}
