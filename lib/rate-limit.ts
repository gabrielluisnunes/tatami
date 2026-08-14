import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiters = {
  // Rotas críticas — cadastro, autenticação
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'tatami:strict',
  }),

  // Rotas pesadas — email, reconhecimento facial
  heavy: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '1 m'),
    analytics: true,
    prefix: 'tatami:heavy',
  }),

  // Rotas normais
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
    prefix: 'tatami:default',
  }),
}

// Helper para extrair IP da requisição
export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}
