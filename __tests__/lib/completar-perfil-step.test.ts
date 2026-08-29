import { getCompletarPerfilInitialStep } from '@/lib/completar-perfil-step'

describe('getCompletarPerfilInitialStep', () => {
  it('começa no calendário quando falta dia e foto', () => {
    expect(getCompletarPerfilInitialStep({
      hasPaymentDueDay: false,
      hasFaceDescriptor: false,
    })).toBe('payment-day')
  })

  it('pula o calendário quando o dia já existe e falta a foto', () => {
    expect(getCompletarPerfilInitialStep({
      hasPaymentDueDay: true,
      hasFaceDescriptor: false,
    })).toBe('instructions')
  })

  it('volta ao calendário quando já tem descriptor e falta o dia', () => {
    expect(getCompletarPerfilInitialStep({
      hasPaymentDueDay: false,
      hasFaceDescriptor: true,
    })).toBe('payment-day')
  })
})
