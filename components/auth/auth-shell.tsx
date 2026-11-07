import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react'

interface AuthShellProps {
  children: ReactNode
  mode: 'login' | 'register'
}

const pillars = [
  { number: '01', title: 'Treine.', description: 'Esteja presente.' },
  { number: '02', title: 'Conecte.', description: 'Evolua com a equipe.' },
  { number: '03', title: 'Evolua.', description: 'Conquiste sua próxima faixa.' },
]

export function AuthShell({ children, mode }: AuthShellProps) {
  const isRegister = mode === 'register'

  return (
    <main className={`auth-shell auth-shell--${mode}`}>
      <section className="auth-story" aria-label="Tatami, dentro e fora do treino">
        <header className="auth-story-top">
          <Link href="/auth/login" className="auth-brand" aria-label="Tatami, início">
            <span className="auth-logo"><Image src="/logo.png" alt="Tatami" width={160} height={160} priority /></span>
          </Link>
          <span className="auth-edition"><span /> A ARTE DE EVOLUIR.</span>
        </header>

        <div className="auth-story-copy">
          <span className="auth-eyebrow"><span /> DENTRO E FORA DO TREINO</span>
          <h2>{isRegister ? <>Uma equipe.<br />Muitas jornadas.<br /><span>Um só tatami.</span></> : <>O próximo<br />nível começa<br /><span>no tatami.</span></>}</h2>
          <p>{isRegister ? 'Mais conexão para sua equipe. Mais espaço para crescer. A gestão acompanha o ritmo da sua academia.' : 'O treino conecta. A disciplina transforma. Sua academia e sua evolução, sempre com você.'}</p>
        </div>

        <div className="auth-belt-art" aria-hidden="true">
          <span className="auth-art-ring auth-art-ring--outer" />
          <span className="auth-art-ring auth-art-ring--inner" />
          <div className="auth-belt auth-belt-back" />
          <div className="auth-belt auth-belt-front"><span /><span /><span /><span /></div>
          <div className="auth-belt-knot" />
          <span className="auth-art-caption">CADA TREINO, UM PASSO À FRENTE.</span>
          <span className="auth-art-mark">柔術</span>
        </div>

        <div className="auth-story-foot">
          <ol className="auth-pillars">
            {pillars.map(pillar => (
              <li key={pillar.number}>
                <span className="auth-pillar-number">{pillar.number}</span>
                <strong>{pillar.title}</strong>
                <span>{pillar.description}</span>
              </li>
            ))}
          </ol>
          <div className="auth-story-bottom">
            <span>Para quem vive o Jiu-Jitsu.</span>
            <span className="flex items-center gap-2">No treino. Na vida. <ArrowUpRight size={16} aria-hidden="true" /></span>
          </div>
        </div>
      </section>

      <section className="auth-form-panel" aria-label={isRegister ? 'Crie sua conta' : 'Entre na sua conta'}>
        <header className="auth-panel-header">
          <Link href="/auth/login" aria-label="Tatami, início" className="auth-mobile-brand auth-logo"><Image src="/logo.png" alt="Tatami" width={160} height={160} priority /></Link>
          <span className="auth-panel-caption">SUA ACADEMIA. SUA JORNADA.</span>
          <span className="auth-access-badge"><span /> {isRegister ? 'Primeiro passo' : 'Seu espaço de evolução'}</span>
        </header>

        <div className="auth-form-content">
          <nav className="auth-tabs" aria-label="Acesso à conta">
            <Link href="/auth/login" aria-current={!isRegister ? 'page' : undefined}>Entrar</Link>
            <Link href="/auth/register" aria-current={isRegister ? 'page' : undefined}>Criar conta <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </nav>
          <div className="auth-form-heading-label"><span /> {isRegister ? 'UMA NOVA JORNADA' : 'BOM TE VER DE NOVO'}</div>
          {children}
          <div className="auth-trust"><ShieldCheck size={15} aria-hidden="true" /><span>Seus dados protegidos. Sua evolução conectada.</span></div>
        </div>

        <footer className="auth-form-footer"><span>© {new Date().getFullYear()} Tatami</span><span className="flex items-center gap-1.5"><Check size={12} aria-hidden="true" /> Feito para o Jiu-Jitsu</span></footer>
      </section>
    </main>
  )
}

export const authInputClass = 'auth-input'
export const authLabelClass = 'auth-label'
export const authButtonClass = 'auth-submit'
