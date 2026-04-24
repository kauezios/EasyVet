# Sprint 3 - Entrega Iteracao 03

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S3-003 - Regras de suspensao por inatividade
- login agora registra `lastLoginAt` para rastrear ultima atividade.
- implementada varredura administrativa de inatividade com:
  - simulacao (`dry-run`)
  - execucao real com inativacao automatica
  - exclusao de papeis configurados
  - auditoria por usuario inativado (`PROFILE_DEACTIVATED_INACTIVITY`)

2. EV-S3-006 - Persistencia da politica de inatividade via painel
- nova persistencia da politica em banco (`InactivityPolicySettings`), removendo dependencia exclusiva de variavel de ambiente.
- API administrativa ampliada:
  - `GET /api/v1/profiles/inactivity-policy`
  - `PATCH /api/v1/profiles/inactivity-policy`
  - `POST /api/v1/profiles/inactivity-scan`
- trilha de auditoria para alteracao da politica:
  - `INACTIVITY_POLICY_UPDATED`

3. Evolucao da UX na aba de usuarios
- painel de politica com controles editaveis:
  - ativar/desativar politica
  - limite de dias
  - papeis excluidos da varredura
- botoes de acao operacional:
  - `Salvar politica`
  - `Descartar`
  - `Simular`
  - `Executar`
  - `Atualizar politica`
- bloqueio de execucao de varredura enquanto houver mudancas nao salvas.

## Arquivos-chave

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260424005000_add_user_last_login/migration.sql`
- `apps/api/prisma/migrations/20260424012000_add_inactivity_policy_settings/migration.sql`
- `apps/api/src/profiles/profiles.controller.ts`
- `apps/api/src/profiles/profiles.service.ts`
- `apps/api/src/profiles/dto/update-inactivity-policy.dto.ts`
- `apps/api/src/profiles/profiles.service.spec.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-3/BACKLOG-SPRINT-3.md`

## Validacoes executadas

- `pnpm --filter api prisma:generate`
- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`
