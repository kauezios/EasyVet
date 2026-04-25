# Sprint 4 - Entrega Iteracao 03

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S4-004 - Atalho de retorno com criacao em 1 clique
- novo endpoint:
  - `POST /api/v1/appointments/:id/return`
- comportamento do endpoint:
  - exige prontuario finalizado para consulta de origem
  - exige data sugerida de retorno preenchida no prontuario
  - localiza automaticamente o proximo horario livre do veterinario
  - cria consulta de retorno com motivo e nota automatica
  - registra auditoria com acao `RETURN_APPOINTMENT_SCHEDULED`

2. Integracao de interface com retorno automatico
- botao do prontuario atualizado para fluxo real de 1 clique:
  - `Agendar retorno (1 clique)`
- em ambiente com API:
  - aciona endpoint de retorno automatico
  - atualiza agenda e historico local imediatamente
  - redireciona para aba de consultas no dia do retorno
- em modo demonstracao:
  - simula criacao automatica em horario livre
  - registra evento de auditoria local para validacao visual

3. Cobertura automatizada adicional
- testes unitarios ampliados para `AppointmentsService` cobrindo:
  - agendamento automatico de retorno bem-sucedido
  - bloqueio de agendamento quando prontuario nao esta finalizado

## Arquivos-chave

- `apps/api/src/appointments/appointments.controller.ts`
- `apps/api/src/appointments/appointments.service.ts`
- `apps/api/src/appointments/appointments.service.spec.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-4/BACKLOG-SPRINT-4.md`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`
