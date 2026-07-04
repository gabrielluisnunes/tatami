import { Resend } from 'resend'
import { env } from './env'

export const resend = new Resend(env.RESEND_API_KEY)

if (!env.RESEND_API_KEY) {
  console.error('[FATAL] RESEND_API_KEY não está definida — emails não serão enviados')
}

export async function sendWelcomeEmail(
  to: string,
  studentName: string,
  academyName: string,
  tempPassword: string,
  loginUrl: string
) {
  await resend.emails.send({
    from: 'Tatami <noreply@gestaotatami.com.br>',
    to,
    subject: `Seu acesso ao Tatami — ${academyName}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">

        <!-- Header -->             
        <tr>
          <td style="background:#18181b;padding:32px 32px 24px;border-bottom:1px solid #27272a;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">
              🥋 Tatami
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:#71717a;">${academyName}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
              Bem-vindo, ${studentName}!
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
              Seu acesso ao portal do aluno foi criado. Use as credenciais abaixo para entrar pela primeira vez.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:12px;border:1px solid #27272a;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#52525b;">
                    Suas credenciais
                  </p>              
                  <p style="margin:0 0 6px;font-size:13px;color:#71717a;">
                    Email: <span style="color:#e4e4e7;font-weight:500;">${to}</span>
                  </p>              
                  <p style="margin:0;font-size:13px;color:#71717a;">
                    Senha temporária:
                    <span style="color:#818cf8;font-weight:700;font-size:16px;letter-spacing:.05em;">
                      ${tempPassword}
                    </span>
                  </p>
                </td>
              </tr>                 
            </table>

            <p style="margin:0 0 24px;font-size:13px;color:#71717a;line-height:1.6;">
              Recomendamos que você altere sua senha após o primeiro acesso em
              <strong style="color:#a1a1aa;">Perfil → Alterar senha</strong>.
            </p>

            <!-- CTA Button -->     
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4f46e5;border-radius:10px;">
                  <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Acessar portal →
                  </a>              
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #27272a;">
            <p style="margin:0;font-size:11px;color:#3f3f46;text-align:center;">
              Você recebeu este email porque foi cadastrado como aluno em ${academyName}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Bem-vindo, ${studentName}!

Seu acesso ao portal do aluno da ${academyName} foi criado.

Suas credenciais:
Email: ${to}
Senha temporária: ${tempPassword}

Acesse o portal em: ${loginUrl}

Recomendamos que você altere sua senha após o primeiro acesso em Perfil > Alterar senha.

Você recebeu este email porque foi cadastrado como aluno em ${academyName}.`,
  })
}

export async function sendOverdueAlert(
  to: string,
  studentName: string,
  amount: number,
  dueDate: string,
  academyName: string,
) {
  const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  await resend.emails.send({
    from: 'Tatami <noreply@gestaotatami.com.br>',
    to,
    subject: `Mensalidade em atraso — ${academyName}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">

        <tr>
          <td style="background:#18181b;padding:32px 32px 24px;border-bottom:1px solid #27272a;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">🥋 Tatami</p>
            <p style="margin:6px 0 0;font-size:13px;color:#71717a;">${academyName}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
              Mensalidade em atraso
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
              Olá, ${studentName}. Identificamos uma mensalidade em aberto no seu cadastro.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:12px;border:1px solid #27272a;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#52525b;">
                    Detalhes da cobrança
                  </p>
                  <p style="margin:0 0 6px;font-size:13px;color:#71717a;">
                    Valor: <span style="color:#e4e4e7;font-weight:500;">${amountFormatted}</span>
                  </p>
                  <p style="margin:0;font-size:13px;color:#71717a;">
                    Vencimento: <span style="color:#f87171;font-weight:500;">${dueDate}</span>
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:13px;color:#71717a;line-height:1.6;">
              Entre em contato com sua academia para regularizar o pagamento o quanto antes.
            </p>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4f46e5;border-radius:10px;">
                  <a href="https://gestaotatami.com.br/aluno/financeiro" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Ver meu financeiro →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #27272a;">
            <p style="margin:0;font-size:11px;color:#3f3f46;text-align:center;">
              Você recebeu este email porque possui um cadastro ativo em ${academyName}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Olá, ${studentName}.

Sua mensalidade de ${amountFormatted} venceu em ${dueDate} e ainda está em aberto.

Entre em contato com sua academia (${academyName}) para regularizar o pagamento.

Acesse: https://gestaotatami.com.br/aluno/financeiro`,
  })
}

export async function sendDueTodayAlert(
  to: string,
  studentName: string,
  amount: number,
  dueDate: string,
  academyName: string,
) {
  const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const [y, m, d] = dueDate.split('-')
  const formattedDate = `${d}/${m}/${y}`

  await resend.emails.send({
    from: 'Tatami <noreply@gestaotatami.com.br>',
    to,
    subject: `Sua mensalidade vence hoje — ${academyName}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">

        <tr>
          <td style="background:#18181b;padding:32px 32px 24px;border-bottom:1px solid #27272a;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">🥋 Tatami</p>
            <p style="margin:6px 0 0;font-size:13px;color:#71717a;">${academyName}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
              Sua mensalidade vence hoje
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
              Olá, ${studentName}! Lembramos que sua mensalidade vence hoje.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:12px;border:1px solid #27272a;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#52525b;">
                    Detalhes da cobrança
                  </p>
                  <p style="margin:0 0 6px;font-size:13px;color:#71717a;">
                    Valor: <span style="color:#e4e4e7;font-weight:500;">${amountFormatted}</span>
                  </p>
                  <p style="margin:0;font-size:13px;color:#71717a;">
                    Vencimento: <span style="color:#818cf8;font-weight:500;">${formattedDate}</span>
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:13px;color:#71717a;line-height:1.6;">
              O pagamento deve ser realizado diretamente na academia. Evite atrasos para manter seu cadastro em dia.
            </p>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4f46e5;border-radius:10px;">
                  <a href="https://gestaotatami.com.br/aluno/financeiro" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Ver meu financeiro →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #27272a;">
            <p style="margin:0;font-size:11px;color:#3f3f46;text-align:center;">
              Você recebeu este email porque possui um cadastro ativo em ${academyName}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Olá, ${studentName}!

Sua mensalidade de ${amountFormatted} vence hoje (${formattedDate}).

O pagamento deve ser realizado diretamente na academia ${academyName}.

Acesse: https://gestaotatami.com.br/aluno/financeiro`,
  })
}
