# Tatami

SaaS de gestão de academias de artes marciais. Desenvolvido com Next.js 14, Supabase e TypeScript.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + Auth + Storage)
- **Pagamentos:** Stripe (SaaS billing), PIX estático (BR Code)
- **Email:** Resend
- **Deploy:** Vercel
- **CI/CD:** GitHub Actions

## Funcionalidades

- Autenticação com Supabase Auth, onboarding e planos via Stripe
- Gestão de alunos, professores e turmas
- Suporte a múltiplos esportes por aluno (Jiu-Jitsu, Muay Thai, Boxe)
- Check-in por reconhecimento facial (face-api.js, processamento server-side)
- Sistema de graduações com histórico por esporte
- Financeiro automático com geração de cobranças mensais e PIX
- Portal do aluno (frequência, graduações, financeiro, contratos)
- Área do professor (check-in, turmas, frequência)
- Comunicados por email em batch (Resend)
- Exportação de relatórios em Excel
- Contratos digitais com assinatura

## Desenvolvimento local

### Pré-requisitos

- Node.js 20+
- Docker Desktop
- Supabase CLI

### Setup

```bash
# Instalar dependências
npm install

# Subir o Supabase local
supabase start

# Rodar o projeto apontando para o banco local
npm run dev:docker
```

Acesse em `http://localhost:3000`.

O Supabase Studio local estará disponível em `http://127.0.0.1:54323`.

### Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com suas chaves.

As variáveis necessárias estão listadas em `.env.example`.

### Migrations

As migrations ficam em `supabase/migrations/`. Para aplicar no banco local:

```bash
supabase db push
```

Para aplicar em produção, execute cada arquivo via Supabase Dashboard (SQL Editor).

## Estrutura de branches

Todo código passa por Pull Request com CI obrigatório (build + TypeScript) antes de mergear.

## Scripts

```bash
npm run dev          # desenvolvimento (banco de produção)
npm run dev:docker   # desenvolvimento (banco local)
npm run build        # build de produção
```