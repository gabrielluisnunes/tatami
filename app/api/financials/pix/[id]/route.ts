import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimiters, getIp } from '@/lib/rate-limit'
import { getChargeForStudentPayment } from '@/lib/services/financials.service'

// Gera payload PIX estático seguindo padrão EMV do Banco Central (BR Code)
function generatePixPayload(
  pixKey: string,
  amount: number,
  description: string,
  merchantName: string,
  merchantCity: string = 'SAO PAULO'
): string {
  function tlv(id: string, value: string): string {
    const len = String(value.length).padStart(2, '0')
    return `${id}${len}${value}`
  }

  // Merchant Account Information (PIX)
  const gui = tlv('00', 'BR.GOV.BCB.PIX')
  const key = tlv('01', pixKey)
  const additionalData = description ? tlv('02', description.slice(0, 72)) : ''
  const merchantAccountInfo = tlv('26', gui + key + additionalData)

  // Amount
  const amountStr = amount.toFixed(2)

  // Additional data (txid)
  const txid = tlv('05', '***')
  const additionalDataField = tlv('62', txid)

  // Payload sem CRC
  const payload = [
    tlv('00', '01'),           // Payload Format Indicator
    merchantAccountInfo,        // Merchant Account Information
    tlv('52', '0000'),         // Merchant Category Code
    tlv('53', '986'),          // Transaction Currency (BRL)
    tlv('54', amountStr),      // Transaction Amount
    tlv('58', 'BR'),           // Country Code
    tlv('59', merchantName.slice(0, 25).toUpperCase()), // Merchant Name
    tlv('60', merchantCity.slice(0, 15).toUpperCase()), // Merchant City
    additionalDataField,        // Additional Data Field
    '6304',                     // CRC placeholder
  ].join('')

  // Calcular CRC16
  function crc16(str: string): string {
    let crc = 0xFFFF
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  }

  return payload + crc16(payload)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ip = getIp(request)
  const { success } = await rateLimiters.default.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
      { status: 429 }
    )
  }

  const supabase = createClient()


  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id || profile.role !== 'aluno') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const chargeResult = await getChargeForStudentPayment(supabase, params.id, user.id)

  if (!chargeResult.ok) {
    if (chargeResult.error === 'not_found') {
      return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Cobrança não disponível para pagamento' }, { status: 400 })
  }

  const financial = chargeResult.financial

  // Buscar chave PIX da academia
  const adminSupabase = createStorageAdminClient()
  const { data: academy } = await adminSupabase
    .from('academies')
    .select('name, pix_key, pix_key_type')
    .eq('id', profile.academy_id)
    .single()

  if (!academy?.pix_key) {
    return NextResponse.json({ 
      error: 'Academia não configurou chave PIX ainda' 
    }, { status: 400 })
  }

  const dueDate = new Date(financial.due_date + 'T00:00:00')
  const monthYear = dueDate.toLocaleDateString('pt-BR', { 
    month: 'long', year: 'numeric' 
  })
  const description = `Mensalidade ${monthYear}`
  const merchantName = academy.name.slice(0, 25)

  function normalizePixKey(key: string, type: string): string {
    if (type === 'celular') {
      // Remove tudo exceto dígitos
      const digits = key.replace(/\D/g, '')
      // Se já tem 13 dígitos (55 + DDD + número), retorna com +
      if (digits.length === 13) return `+${digits}`
      // Se tem 11 dígitos (DDD + número), adiciona +55
      if (digits.length === 11) return `+55${digits}`
      // Se tem 10 dígitos (DDD + número sem o 9), adiciona +55
      if (digits.length === 10) return `+55${digits}`
      return `+55${digits}`
    }
    if (type === 'cpf') {
      // Remove formatação, mantém só dígitos
      return key.replace(/\D/g, '')
    }
    if (type === 'cnpj') {
      // Remove formatação, mantém só dígitos
      return key.replace(/\D/g, '')
    }
    // email e aleatoria: retornar como está
    return key.trim()
  }

  const normalizedKey = normalizePixKey(academy.pix_key, academy.pix_key_type ?? '')
  const pixPayload = generatePixPayload(
    normalizedKey,
    Number(financial.amount),
    description,
    merchantName,
  )

  return NextResponse.json({
    pix_payload: pixPayload,
    pix_key: academy.pix_key,
    pix_key_type: academy.pix_key_type,
    amount: Number(financial.amount),
    description,
    academy_name: academy.name,
  })
}
