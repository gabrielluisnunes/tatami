import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_REKOGNITION_COLLECTION_PREFIX: z.string().default('tatami'),
  RESEND_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
})

// Safely parse env variables during the Next.js static build phase to allow compilation.
// Strict validation and error throwing will occur at runtime boot.
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

const parsed = isBuildTime
  ? envSchema.safeParse(process.env)
  : { success: true, data: envSchema.parse(process.env) }

export const env = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>)
