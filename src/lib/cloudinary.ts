import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

// PDF 업로드 (서버 사이드)
export async function uploadPayslipPdf(
  fileBuffer: Buffer,
  filename: string
): Promise<{ public_id: string; secure_url: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'payslips',
        public_id: filename,
        format: 'pdf',
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result as { public_id: string; secure_url: string })
      }
    )
    uploadStream.end(fileBuffer)
  })
}

// 서명된 URL 생성 (일정 시간 후 만료)
export function generateSignedUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true,
  })
}
