import { generateTempPassword } from '@/lib/temp-password'

describe('generateTempPassword', () => {
  it('gera senha com tamanho padrão', () => {
    expect(generateTempPassword()).toHaveLength(10)
  })

  it('gera senhas diferentes entre chamadas', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTempPassword()))
    expect(passwords.size).toBeGreaterThan(1)
  })

  it('usa apenas caracteres permitidos', () => {
    const allowed = /^[A-HJ-NP-Zabcdefghijkmnpqrstuvwxyz23456789]+$/
    expect(generateTempPassword(20)).toMatch(allowed)
  })
})
