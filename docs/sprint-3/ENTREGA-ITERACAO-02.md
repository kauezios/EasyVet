# Sprint 3 - Entrega Iteracao 02

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S3-004 - Painel de seguranca resumido
- evoluida a aba `Auditoria` com bloco de monitoramento rapido:
  - total de eventos
  - eventos na visualizacao atual
  - eventos nas ultimas 24h
  - eventos de risco nas ultimas 24h
  - quantidade de atores unicos
- exibicao de `ultimo evento` para orientacao operacional.
- nova faixa de `Alertas de risco recentes` priorizando eventos criticos filtrados.

2. EV-S3-005 - Exportacao da trilha de auditoria
- novo CTA `Exportar CSV` na aba de auditoria.
- exporta somente os eventos ja filtrados na tela (entidade + acao + busca textual).
- payload do arquivo inclui:
  - `created_at`
  - `entity`
  - `action`
  - `entity_id`
  - `actor_id`
  - `summary`

3. Refinos visuais operacionais
- reforco de hierarquia visual com contraste por severidade.
- badge de acao mantendo leitura rapida para triagem de seguranca.

## Arquivos-chave

- `apps/web/src/app/page.tsx`
- `docs/sprint-3/BACKLOG-SPRINT-3.md`

## Validacoes executadas

- `pnpm --filter web lint`
- `pnpm --filter web build`
- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
