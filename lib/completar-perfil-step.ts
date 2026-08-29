export type CompletarPerfilInitialStep = 'payment-day' | 'instructions'

export function getCompletarPerfilInitialStep(opts: {
  hasPaymentDueDay: boolean
  hasFaceDescriptor: boolean
}): CompletarPerfilInitialStep {
  if (opts.hasPaymentDueDay && !opts.hasFaceDescriptor) {
    return 'instructions'
  }

  return 'payment-day'
}
