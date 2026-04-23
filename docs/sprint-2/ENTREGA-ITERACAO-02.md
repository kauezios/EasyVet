# Sprint 2 - Entrega Iteracao 02

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. Tela de gestao de perfis operacionais (EV-S2-004)
- nova aba `Perfis` no painel lateral do workspace.
- comportamento por permissao:
  - sem sessao: orienta login.
  - sessao nao-admin: acesso bloqueado com feedback de permissao.
  - sessao admin: habilita gestao completa.

2. Operacoes de perfil na UI
- listar perfis via API (`GET /profiles`) quando admin autenticado.
- criar perfil (`POST /profiles`) com:
  - nome
  - e-mail
  - role
  - senha inicial
- alterar role por linha (`PATCH /profiles/:id/role`).
- mensagens de status e erro integradas ao feedback global da tela.

3. Fallback funcional no modo demonstracao
- em ambiente de demo, a aba de perfis funciona sem API:
  - cria perfil localmente
  - atualiza role localmente
- mantem previsibilidade de validacao visual no `localhost`.

## Arquivos-chave

- `apps/web/src/app/page.tsx`
- `docs/sprint-2/BACKLOG-SPRINT-2.md`

## Validacoes executadas

- `pnpm --filter web lint`
- `pnpm --filter web build`
