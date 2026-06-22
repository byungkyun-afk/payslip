import { createServiceClient } from './supabase'

const BUCKET = 'payslip'

// PDF를 Supabase Storage에 업로드하고 경로 반환
export async function uploadPayslipToStorage(
  fileBuffer: Buffer,
  storagePath: string
): Promise<string> {
  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) throw error
  return storagePath
}

// Supabase Storage에서 PDF 다운로드
export async function downloadPayslipFromStorage(storagePath: string): Promise<ArrayBuffer> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath)
  if (error) throw error
  return data.arrayBuffer()
}

// 임시 서명 URL 생성 (24시간)
export async function createSignedUrl(storagePath: string, expiresIn = 86400): Promise<string> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  return data.signedUrl
}
