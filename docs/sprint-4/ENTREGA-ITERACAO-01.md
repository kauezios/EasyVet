# Sprint 4 - Entrega Iteracao 01

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S4-001 - Remarcacao assistida na agenda diaria
- nova acao `Remarcar` na grade de consultas do dia.
- abertura de painel lateral dedicado para remarcacao com:
  - contexto completo da consulta atual
  - selecao de nova data dentro da janela operacional
  - selecao de horario livre com bloqueio visual de conflitos
- atualizacao imediata da agenda local apos confirmacao da remarcacao.

2. EV-S4-002 - Agendamento de retorno a partir do prontuario
- novo CTA `Agendar retorno` no prontuario.
- ao acionar:
  - sistema abre aba de agendamentos
  - paciente, veterinario e motivo de retorno sao pre-preenchidos
  - data sugerida de retorno e reaproveitada quando informada.

## Arquivo-chave

- `apps/web/src/app/page.tsx`
- `docs/sprint-4/BACKLOG-SPRINT-4.md`

## Validacoes executadas

- `pnpm --filter web lint`
- `pnpm --filter web build`
