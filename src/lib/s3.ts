import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!
const FOLDER = 'payslips'

export async function uploadPayslipToS3(fileBuffer: Buffer, storagePath: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${FOLDER}/${storagePath}`,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  }))
  return storagePath
}

export async function downloadPayslipFromS3(storagePath: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: `${FOLDER}/${storagePath}`,
  }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function createS3SignedUrl(storagePath: string, expiresIn = 604800): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET,
    Key: `${FOLDER}/${storagePath}`,
  }), { expiresIn })
}
