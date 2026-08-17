/** Helpers compartilhados para testes de API. */

export const IDS = {
  admin: '550e8400-e29b-41d4-a716-446655440010',
  student: '550e8400-e29b-41d4-a716-446655440011',
  financial: '550e8400-e29b-41d4-a716-446655440012',
  academy: '550e8400-e29b-41d4-a716-446655440013',
}

export function mockRateLimitOk() {
  jest.mock('@/lib/rate-limit', () => ({
    getIp: jest.fn(() => '127.0.0.1'),
    rateLimiters: {
      strict: { limit: jest.fn().mockResolvedValue({ success: true }) },
      default: { limit: jest.fn().mockResolvedValue({ success: true }) },
      heavy: { limit: jest.fn().mockResolvedValue({ success: true }) },
    },
  }))
}

/** Chain simples: from().select().eq()...single() / maybeSingle / etc */
export function chainResolve(data: unknown, error: unknown = null) {
  const terminal = {
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    limit: jest.fn().mockResolvedValue({ data, error }),
  }

  const api: Record<string, unknown> = {
    ...terminal,
    select: jest.fn(() => api),
    eq: jest.fn(() => api),
    in: jest.fn(() => api),
    update: jest.fn(() => api),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    order: jest.fn(() => api),
    gte: jest.fn(() => api),
    lte: jest.fn(() => api),
    lt: jest.fn(() => api),
  }

  return api
}
