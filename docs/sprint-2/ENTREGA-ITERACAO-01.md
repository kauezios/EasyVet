# Sprint 2 - Entrega Iteracao 01

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. Autenticacao real com usuario persistido (EV-S2-001)
- novo model `User` no Prisma com:
  - `email` unico
  - `passwordHash`
  - `role` (`ADMIN`, `VETERINARIAN`, `RECEPTION`)
  - `active`
- novos endpoints:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- token assinado por HMAC-SHA256 com expiracao
- hash de senha com `scrypt`

2. Sessao basica no frontend (EV-S2-002)
- bloco de acesso no topo do workspace:
  - login (email/senha)
  - estado de sessao logada
  - logout
- em modo demo, login local com credenciais padrao para validacao visual.

3. Endurecimento RBAC admin (EV-S2-003)
- modulo de perfis administrativos agora exige:
  - token valido (`AuthenticatedGuard`)
  - papel `ADMIN` (`RolesGuard`)
- `RolesGuard` prioriza papel da sessao autenticada e mantem fallback para header durante transicao.

4. Seed e bootstrap
- seed atualizado com usuarios basicos:
  - `admin@easyvet.local`
  - `vet@easyvet.local`
  - `recepcao@easyvet.local`
- senha padrao de bootstrap/seed: `easyvet123`

## Arquivos-chave

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260423193000_add_users_auth/migration.sql`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/common/auth/authenticated.guard.ts`
- `apps/api/src/common/auth/password.util.ts`
- `apps/api/src/common/auth/token.util.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-2/BACKLOG-SPRINT-2.md`

## Validacoes executadas

- `pnpm --filter api exec prisma generate`
- `pnpm --filter api lint`
- `pnpm --filter api build`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter web lint`
- `pnpm --filter web build`
