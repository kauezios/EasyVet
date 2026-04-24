# Sprint 2 - Entrega Iteracao 03

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S2-005 - Auditoria de eventos sensiveis
- criado modulo de auditoria com endpoint administrativo:
  - `GET /api/v1/audit-events?limit=120`
- auditoria registrada para:
  - autenticacao (sucesso, falha, bloqueio)
  - alteracao de papel de perfil (`ROLE_CHANGED`)
  - finalizacao de prontuario (`MEDICAL_RECORD_FINALIZED`)
- nova aba `Auditoria` no frontend para consulta da trilha por administradores.

2. EV-S2-006 - Hardening de seguranca basico
- politica minima de senha aplicada na criacao de hash:
  - codigo de erro: `AUTH_PASSWORD_POLICY_INVALID`
- lock de tentativas de login invalidas:
  - contador por usuario (`failedLoginAttempts`)
  - bloqueio temporario (`lockedUntil`)
  - codigo de erro: `AUTH_ACCOUNT_LOCKED`
- expiracao de token configuravel por ambiente:
  - `AUTH_TOKEN_EXPIRES_IN_SECONDS`

3. Configuracoes de seguranca adicionadas em ambiente
- `AUTH_PASSWORD_MIN_LENGTH`
- `AUTH_LOGIN_MAX_ATTEMPTS`
- `AUTH_LOGIN_LOCK_MINUTES`
- `AUTH_TOKEN_EXPIRES_IN_SECONDS`

## Arquivos-chave

- `apps/api/src/audit-events/*`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/common/auth/auth-security.config.ts`
- `apps/api/src/common/auth/password.util.ts`
- `apps/api/src/common/auth/token.util.ts`
- `apps/api/src/profiles/profiles.service.ts`
- `apps/api/src/medical-records/medical-records.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260423213000_auth_security_hardening/migration.sql`
- `apps/web/src/app/page.tsx`
- `docs/sprint-2/BACKLOG-SPRINT-2.md`

## Validacoes executadas

- `pnpm --filter api exec prisma generate`
- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`
