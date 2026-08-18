import { randomInt } from 'crypto'

// Charset sem caracteres ambíguos (0/O, 1/l/I)
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTempPassword(length = 10): string {
  return Array.from(
    { length },
    () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)],
  ).join('')
}
