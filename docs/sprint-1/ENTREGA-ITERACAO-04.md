# Sprint 1 - Entrega Iteracao 04

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. RBAC base para prontuario (EV-S1-008)
- adicionados decorator e guard de papeis:
  - `Roles(...)`
  - `RolesGuard`
- leitura de papel via header `x-user-role`
- regra aplicada no endpoint de finalizacao de prontuario:
  - permitido: `ADMIN`, `VETERINARIAN`
  - bloqueado: `RECEPTION`

2. Gestao administrativa de perfis (base)
- novo modulo `profiles` com endpoints administrativos:
  - `GET /api/v1/profiles`
  - `POST /api/v1/profiles`
  - `PATCH /api/v1/profiles/:id/role`
- endpoints protegidos para papel `ADMIN`
- validacao de role por enum e validacao de e-mail duplicado no cadastro

3. Ajustes de interface para validacao em localhost
- seletor `Perfil ativo` na tela principal
- requests do frontend enviam `x-user-role`
- botao `Finalizar prontuario` desabilitado para perfil de recepcao

## Arquivos-chave

- `apps/api/src/common/auth/user-role.enum.ts`
- `apps/api/src/common/auth/roles.decorator.ts`
- `apps/api/src/common/auth/roles.guard.ts`
- `apps/api/src/profiles/profiles.controller.ts`
- `apps/api/src/profiles/profiles.service.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-1/BACKLOG-SPRINT-1.md`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api build`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter web lint`
- `pnpm --filter web build`
