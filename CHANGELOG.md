# Changelog

Todas as mudanças notáveis do projeto Tatami serão documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
Versioning baseado em [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2026-08-08

### Added
- Suporte a múltiplos esportes por aluno (Jiu-Jitsu, Muay Thai, Boxe)
- Tabela `student_sports` para armazenar esportes e graduações por aluno
- Campo `sport` nas turmas para identificar o esporte de cada aula
- Validação de esporte no check-in — aluno não aparece em turma de esporte que não pratica
- Portal do aluno adaptado com graduações e frequência separadas por esporte
- Migrations versionadas em `supabase/migrations/`
- Configuração do Supabase CLI (`supabase/config.toml`)

### Changed
- View `v_trainings_since_belt` recriada para contar treinos separadamente por esporte
- Dashboard de graduações agrupado por aluno com modal de seleção de esporte
- Cadastro e edição de alunos adaptados para múltiplos esportes
- Professor vê apenas suas próprias turmas no check-in
- CI/CD atualizado para Node.js 20

---

## [1.0.0] - 2026-07-01

### Added
- Autenticação e onboarding com Stripe (trial de 7 dias + planos Starter/Pro)
- Gestão completa de alunos e professores
- Check-in por reconhecimento facial (face-api.js, LGPD compliant)
- Sistema de graduações com graus (0-4)
- Financeiro automático com geração de cobranças mensais
- PIX estático com QR Code (padrão BR Code Banco Central)
- Portal do aluno (frequência, graduações, financeiro, contratos)
- Área do professor (check-in, turmas, frequência de alunos)
- Comunicados por email via Resend
- Exportação de relatórios Excel (frequência e inadimplência)
- Contratos digitais com assinatura
- Aniversariantes do mês no dashboard
- CI/CD com GitHub Actions (feature → staging → main)
- Docker para ambiente local de desenvolvimento
