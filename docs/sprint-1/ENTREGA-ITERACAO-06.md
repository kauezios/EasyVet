# Sprint 1 - Entrega Iteracao 06

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S1-010 - Pipeline CI minima
- criado workflow do GitHub Actions em:
  - `.github/workflows/ci.yml`
- gatilhos:
  - `pull_request` para `main`
  - `push` para `main`
- etapas executadas:
  - instalacao de dependencias com `pnpm install --frozen-lockfile`
  - `pnpm --filter api lint`
  - `pnpm --filter api test`
  - `pnpm --filter api test:e2e`
  - `pnpm --filter api build`
  - `pnpm --filter web lint`
  - `pnpm --filter web build`

2. Encerramento de backlog da Sprint 1
- EV-S1-010 marcado como concluido.
- status da sprint atualizado para `Concluida`.

## Arquivos-chave

- `.github/workflows/ci.yml`
- `docs/sprint-1/BACKLOG-SPRINT-1.md`

## Observacao

- O workflow foi desenhado para funcionar sem dependencia de banco externo no E2E atual, pois o teste principal usa Prisma em memoria.
