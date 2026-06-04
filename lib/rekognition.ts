import { RekognitionClient } from '@aws-sdk/client-rekognition'
import { env } from './env'

export const rekognitionClient = new RekognitionClient({
  region: env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function indexFace(imageBytes: Buffer, externalImageId: string) {
  void imageBytes;
  void externalImageId;
}

export async function searchFacesByImage(imageBytes: Buffer) {
  void imageBytes;
}
