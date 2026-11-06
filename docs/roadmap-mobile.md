# Tatami · Do portal ao app

O primeiro cliente é a academia de jiu-jitsu. O gestor usa a web para operar a escola. O aluno usa o celular para saber quando treinar, registrar presença e acompanhar a evolução. A receita inicial vem da assinatura da academia.

| Entrega | Escopo | Critério para avançar |
| --- | --- | --- |
| 1. Segurança e ambientes | Validar isolamento entre academias e permissões de banco e storage. Montar staging com dados fictícios. | Duas academias isoladas em testes. Gestor, professor e aluno concluem os fluxos com suas próprias permissões. |
| 2. Front mobile | Redesenhar a home do aluno, primeiro acesso, agenda, presença e progresso. Revisar navegação, contraste, acessibilidade e estados de erro. Mostrar cada mudança em preview com dados fictícios e capturas de tela no PR. | Uma pessoa convidada consegue entrar, encontrar a próxima aula e ver a evolução no iPhone e Android. |
| 3. Piloto e Stripe | Rodar quatro semanas com uma ou duas academias. Testar QR temporário e chamada manual. Em Stripe Test Mode, validar checkout, webhook, duplicatas, cancelamento, inadimplência, recuperação e portal da academia. Tratar PIX do aluno como fluxo separado. | Medir ativação, uso na quarta semana e adesão paga das academias. Validar o ciclo de cobrança antes de ativar o modo live. |
| 4. App iOS e Android | Validar Expo com sessão e recuperação de conta, links de convite, câmera para QR e progresso. Usar o backend atual com operações autenticadas e contratos de API próprios para o app. Preparar privacidade, exclusão de conta e revisão das regras de pagamento das lojas. | TestFlight e teste fechado no Google Play aprovados pela turma piloto. |
| 5. Landing no domínio | Usar o domínio existente para apresentar benefício, demonstração real, oferta e CTA para academias. Confirmar os endereços da landing e do painel antes de alterar DNS. | O caminho do CTA até onboarding e assinatura funciona em staging e em produção. |

## Fluxo de entrega

- PRs pequenos para `staging`, com diff revisável e testes do CI. Mudanças visuais incluem preview e capturas. Promoção de `staging` para `main` em PR próprio.
- Migrações versionadas. Validar em staging e registrar a ordem de publicação e o plano de reversão em cada entrega.
- Para medir o piloto, acompanhar convite aceito, primeira presença, alunos ativos na quarta semana e conversão de academias para o plano pago.

## Acessos por etapa

- **Supabase:** projeto de staging separado, acesso de leitura ao schema e às políticas efetivas para a auditoria e acesso de migração no staging quando for aplicar a mudança. Usar conexão autenticada e segredos do ambiente.
- **GitHub e previews:** permissão de push e PR no repositório, Actions habilitado e preview ligado ao staging. Vincular o preview somente a dados e chaves de teste.
- **Stripe:** acesso a Test Mode, definição de planos e preços e segredos no ambiente de staging. Ativar live após validar o piloto e o ciclo de cobrança.
- **Lojas:** Apple Developer e App Store Connect, Google Play Console, nomes e identificadores dos apps, conta para testes, política de privacidade e canal de suporte.
- **Landing:** domínio atual, acesso ao provedor DNS quando chegar a publicação e material de venda validado no piloto.
