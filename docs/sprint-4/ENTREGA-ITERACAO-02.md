# Sprint 4 - Entrega Iteracao 02

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S4-003 - Auditoria de mudancas de horario de consulta
- fluxo de remarcacao (`PATCH /api/v1/appointments/:id/reschedule`) agora registra evento de auditoria.
- evento gravado:
  - `entity`: `APPOINTMENT`
  - `action`: `APPOINTMENT_RESCHEDULED`
- resumo do evento contem:
  - horario anterior da consulta
  - novo horario definido
  - alteracao de veterinario (quando houver)

2. Cobertura automatizada
- novos testes unitarios para `AppointmentsService`:
  - valida que remarcacao bem-sucedida gera evento auditavel com dados esperados
  - valida que remarcacao com conflito de horario nao grava evento

## Arquivos-chave

- `apps/api/src/appointments/appointments.service.ts`
- `apps/api/src/appointments/appointments.service.spec.ts`
- `docs/sprint-4/BACKLOG-SPRINT-4.md`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
