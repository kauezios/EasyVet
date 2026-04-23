# Sprint 1 - Entrega Iteracao 05

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S1-009 - Testes E2E do fluxo principal
- substituido E2E basico de health por suite de fluxo principal:
  - cadastro de tutor
  - cadastro de paciente
  - agendamento de consulta
  - inicio e salvamento de rascunho de prontuario
  - validacao de RBAC na finalizacao (`RECEPTION` bloqueado)
  - finalizacao de prontuario por `VETERINARIAN`
  - confirmacao de consulta em status `COMPLETED` apos finalizacao
- E2E executa com Prisma em memoria no teste para nao depender de banco externo.

2. Base de seed para ambiente local
- criado script `prisma/seed.ts` no `apps/api`
- seed idempotente com dados operacionais de tutor, paciente, agenda e prontuario inicial
- adicionado comando:
  - `pnpm --filter api prisma:seed`

3. Padronizacao de bootstrap HTTP
- criado `configureHttpApp` para centralizar:
  - prefixo global
  - correlation id
  - validation pipe
  - filtro de erros
  - envelope de resposta
- `main.ts` e E2E agora usam a mesma configuracao HTTP.

## Arquivos-chave

- `apps/api/test/app.e2e-spec.ts`
- `apps/api/test/support/in-memory-prisma.ts`
- `apps/api/src/common/http/configure-http-app.ts`
- `apps/api/src/main.ts`
- `apps/api/prisma/seed.ts`
- `apps/api/package.json`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api build`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter web lint`
- `pnpm --filter web build`
