🥋 Tatami — Sistema de Gestão de Academias de Artes Marciais


SaaS web completo para digitalizar e automatizar a gestão de academias de artes marciais. Desenvolvido a partir de uma necessidade real observada no dia a dia de uma academia de jiu-jitsu.



Produção: gestaotatami.com.br


📖 Sobre o Projeto

A grande maioria das academias de artes marciais no Brasil ainda opera de forma completamente manual — listas de presença em papel, controle de mensalidades em cadernos, contratos impressos e assinados à mão, e nenhum histórico estruturado de graduações.

O Tatami nasceu para resolver exatamente isso, começando pela própria academia onde o sistema foi idealizado e testado na prática.

Visão de longo prazo: transformar o Tatami em um aplicativo mobile nativo (iOS e Android) com React Native.


✨ Funcionalidades

👑 Dashboard Admin


Cadastro de alunos e professores com envio automático de email (senha temporária ou personalizada)
Sistema de faixas e graus (0–4 graus em todas as faixas: branca, azul, roxa, marrom e preta)
Histórico de graduações com timeline detalhada por aluno
Gestão de turmas (CRUD + visualização de presenças)
Contratos digitais (upload PDF/DOCX, assinaturas, comprovantes)
Dashboard financeiro com métricas em tempo real
Trava de plano: Starter limitado a 50 alunos


📸 Check-in por IA


Professor tira foto da turma
Sistema identifica automaticamente os alunos presentes via reconhecimento facial (face-api.js)
Sem chamada manual, sem lista de papel
Processamento 100% no browser (sem custo de servidor de IA)


💰 Financeiro Automatizado


Cada aluno escolhe seu próprio dia de vencimento no primeiro login
Cron job diário gera cobranças automaticamente no dia escolhido
Email de aviso enviado no dia do vencimento
Email de atraso enviado 1 dia após o vencimento
Admin marca pagamentos como pagos manualmente (PIX, dinheiro, etc.)
Dashboard com métricas: total pago, inadimplentes, valor em atraso


📄 Contratos Digitais


Upload de contratos em PDF ou DOCX
Assinatura eletrônica via canvas
Captura de foto no momento da assinatura
Coleta de CPF e dados do responsável (menores de idade)
Comprovante de assinatura com IP, data/hora e dados completos
Download do documento DOCX com dados da assinatura incorporados


🎓 Portal do Aluno (mobile-first)


Visualização de frequência e treinos acumulados
Timeline completa de graduações com cálculo de treinos por período
Situação financeira (pendente, pago, atrasado)
Contratos assinados com download disponível
Alteração de senha


💳 Gestão de Assinatura 


Plano Starter — R$79/mês (até 50 alunos)
Plano Pro — R$175/mês (ilimitado)
Trial gratuito de 5 dias
Cobrança recorrente via Stripe
Portal de faturamento integrado (Stripe Customer Portal)
Bloqueio automático de acesso por inadimplência
Webhooks para sincronização automática de status



🏗️ Arquitetura

gestaotatami.com.br (Vercel)
│
├── /dashboard/*          → Área do Admin (Server + Client Components)
├── /professor/*          → Área do Professor (mobile-first, dark theme)
├── /aluno/*              → Portal do Aluno (mobile-first, dark theme)
├── /onboarding           → Cadastro de academia + seleção de plano
├── /auth/*               → Login, registro, callback
│
├── /api/students/*       → Cadastro, edição, foto, descriptores faciais
├── /api/classes/*        → CRUD de turmas
├── /api/checkin/*        → Check-in por IA, confirmação
├── /api/financials/*     → Marcar pagamentos, notificações
├── /api/graduations/*    → Registrar graduações, histórico por aluno
├── /api/contracts/*      → Upload, assinatura, download DOCX
├── /api/stripe/*         → Checkout, portal de faturamento
├── /api/webhooks/stripe  → Eventos de assinatura em tempo real
├── /api/cron/*           → Geração de cobranças + atualização de status
│   ├── generate-monthly-charges  → Roda às 9h UTC (6h BRT)
│   └── update-overdue            → Roda às 10h UTC (7h BRT)
│
└── middleware.ts          → Proteção de rotas por role + status de assinatura


🔄 Fluxo Principal

Academia se cadastra
    ↓
Onboarding (nome, modalidade, preço da mensalidade)
    ↓
Seleção de plano → Stripe Checkout → Trial 5 dias
    ↓
Admin cadastra alunos/professores → Email com senha temporária
    ↓
Aluno faz login → Completa perfil (foto biométrica + dia de pagamento)
    ↓
Professor faz check-in por foto → IA identifica alunos presentes
    ↓
Cron diário gera cobranças → Email de aviso → Admin marca como pago
    ↓
Admin registra graduações → Histórico atualizado → Portal do aluno atualiza


🗄️ Modelo de Dados

sql-- Academias (uma por conta admin)
academies (id, owner_id, name, sport, monthly_price, due_day,
           stripe_customer_id, stripe_subscription_id,
           subscription_status, plan, trial_ends_at)

-- Perfis de usuários (admin, professor, aluno)
profiles (id, full_name, role, academy_id, belt, degree,
          belt_updated_at, photo_url, face_descriptor float8[128],
          phone, emergency_phone, payment_due_day,
          cep, address, neighborhood, city, state)

-- Turmas
classes (id, academy_id, name, professor_id, weekdays int[], start_time, end_time)

-- Check-ins (sessões de presença)
checkins (id, academy_id, class_id, professor_id, photo_url,
          checked_in_at, confirmed_at, status)

-- Presenças individuais por check-in
attendance (id, checkin_id, student_id, academy_id, source, similarity, present_at)

-- Cobranças mensais dos alunos
financials (id, student_id, academy_id, amount, due_date, paid_at, status)

-- Histórico de graduações
belt_history (id, student_id, academy_id, belt, degree, graded_at,
              graded_by, notes, trainings_at_graduation)

-- Contratos e assinaturas
contracts (id, academy_id, title, description, file_url, file_type, created_by)
contract_signatures (id, contract_id, student_id, academy_id,
                     signature_url, photo_url, signed_at, ip_address,
                     signer_full_name, signer_cpf, is_minor,
                     guardian_name, guardian_cpf)

-- Views
v_financial_dashboard   → Métricas financeiras por academia
v_trainings_since_belt  → Treinos desde última graduação por aluno


🛠️ Stack Técnica

CamadaTecnologiaFrontendNext.js 14 (App Router) + TypeScriptEstilizaçãoTailwind CSS + shadcn/uiBackendNext.js API RoutesBanco de dadosSupabase (PostgreSQL)AutenticaçãoSupabase AuthStorageSupabase StorageIA (facial)face-api.js (@vladmandic) — browser-sidePagamentosStripe (subscriptions + webhooks)EmailResend (domínio próprio)DeployVercelCron JobsVercel Cron Jobs (vercel.json)Domíniogestaotatami.com.br (DNS via Hostinger)


🚀 Setup Local

Pré-requisitos


Node.js 18+
Conta Supabase
Conta Stripe (modo teste para desenvolvimento)
Conta Resend


Instalação

bashgit clone https://github.com/gabrielluisnunes/tatami
cd tatami
npm install

Variáveis de Ambiente

Crie um arquivo .env.local na raiz do projeto:

env# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Stripe (usar chaves de teste para desenvolvimento)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# Cron Jobs
CRON_SECRET=sua_string_aleatoria_segura

Rodando localmente

bashnpm run dev

Acesse http://localhost:3000


🌐 Deploy (Vercel)

Variáveis de ambiente obrigatórias na Vercel:

Todas as variáveis do .env.local devem ser configuradas em Settings → Environment Variables, marcadas para Production.

Webhook do Stripe em produção:

URL do endpoint: https://www.gestaotatami.com.br/api/webhooks/stripe

Eventos necessários:


checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
invoice.payment_succeeded


Cron Jobs (vercel.json):

json{
  "crons": [
    { "path": "/api/cron/generate-monthly-charges", "schedule": "0 9 * * *" },
    { "path": "/api/cron/update-overdue", "schedule": "0 10 * * *" }
  ]
}


🔒 Segurança


RLS (Row Level Security) ativo em todas as tabelas do Supabase
Todas as rotas de API validam autenticação via supabase.auth.getUser()
academy_id nunca aceito via body — sempre inferido do perfil do usuário logado
Rotas de cron protegidas com CRON_SECRET obrigatória
Webhook do Stripe valida assinatura HMAC antes de processar qualquer evento
Variáveis de ambiente críticas validadas no boot via Zod (falha rápida)
Nenhuma chave sensível exposta no client-side



📦 Planos

FeatureStarter (R$79/mês)Pro (R$175/mês)Alunos ativosAté 50IlimitadosCheck-in por IA✅✅Contratos digitais✅✅Financeiro automatizado✅✅Graduações✅✅Trial gratuito5 dias5 dias


🗺️ Roadmap


 MVP — Sistema web completo
 Stripe em modo Live
 Audit de segurança
 App mobile nativo (iOS e Android) com React Native (pendente)
 Plano Multi-unit (múltiplas filiais) (pendente)
 Integração WhatsApp para alertas (pendente)
 Relatórios avançados e exportação (pendente)



👨‍💻 Autor

Gabriel Nunes — Engenheiro de Software




