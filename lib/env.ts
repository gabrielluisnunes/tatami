import { z } from 'zod'

const envSchema = z.object({
  // Supabase — obrigatórias
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AWS Rekognition — opcionais até implementar check-in por IA
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_REKOGNITION_COLLECTION_PREFIX: z.string().default('tatami'),

  // Resend — opcional até implementar notificações
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY é obrigatória'),

  // Stripe — opcional até implementar pagamentos
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente obrigatórias faltando:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Variáveis de ambiente inválidas. Verifique o .env.local')
}

export const env = parsed.data
