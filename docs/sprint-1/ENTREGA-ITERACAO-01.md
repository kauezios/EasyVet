# Sprint 1 - Entrega Iteracao 01

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. Estrutura de monorepo com `apps/api` e `apps/web`.
2. Docker Compose com PostgreSQL local.
3. API v1 com prefixo `/api/v1`.
4. Padrao de resposta e erro alinhado ao `PADRAO-API-V1`.
5. Persistencia com Prisma e migration inicial.
6. Modulos de cadastro:
- `POST/GET/PATCH /tutors`
- `POST/GET/PATCH /patients`
7. Frontend inicial com formularios de cadastro de tutor e paciente integrados a API.
8. Validacoes tecnicas executadas:
- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`

## Arquivos-chave

- `apps/api/src/main.ts`
- `apps/api/src/tutors/*`
- `apps/api/src/patients/*`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260423133000_init/migration.sql`
- `apps/web/src/app/page.tsx`

## Proximo alvo recomendado

- EV-S1-003 (agenda de consultas) e EV-S1-004 (tela de agenda do dia).
