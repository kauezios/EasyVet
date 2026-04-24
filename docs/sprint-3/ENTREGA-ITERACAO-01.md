# Sprint 3 - Entrega Iteracao 01

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S3-001 - Ciclo de vida de usuario (ativar/inativar)
- novo endpoint administrativo:
  - `PATCH /api/v1/profiles/:id/active`
- regra de seguranca:
  - bloqueio de auto-inativacao do usuario logado (`PROFILE_SELF_DEACTIVATE_NOT_ALLOWED`)
- trilha de auditoria para alteracao de estado:
  - `PROFILE_ACTIVATED`
  - `PROFILE_DEACTIVATED`

2. EV-S3-002 - Filtros operacionais de auditoria
- aprimorada aba `Auditoria` na UI com filtros:
  - entidade
  - acao
  - busca textual (resumo/ids)
- filtros funcionam em conjunto para acelerar investigacao operacional.

3. Evolucao da tela de usuarios
- lista de perfis com status visual `Ativo/Inativo`
- acao direta por linha para ativar/inativar usuario
- feedback de sessao atual para evitar alteracoes incorretas no proprio usuario.

## Arquivos-chave

- `apps/api/src/profiles/profiles.controller.ts`
- `apps/api/src/profiles/profiles.service.ts`
- `apps/api/src/profiles/dto/update-profile-active.dto.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-3/BACKLOG-SPRINT-3.md`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`
