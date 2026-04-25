# Sprint 5 - Entrega Iteracao 01

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S5-001 - Painel de indicadores de consultas por janela temporal
- novo endpoint de metricas:
  - `GET /api/v1/appointments/metrics?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- consolidacao de indicadores no backend:
  - total de consultas
  - distribuicao por status (agendada, confirmada, em atendimento, concluida, cancelada, no-show)
  - quantidade de consultas de retorno
  - taxa de no-show e taxa de conclusao
- validacao de faixa de datas com erro de dominio:
  - `APPOINTMENT_METRICS_INVALID_RANGE`

2. EV-S5-002 - Marcacao operacional de no-show na agenda
- nova acao `No-show` na grade diaria de consultas.
- ajuste de estados terminais na UI para bloquear transicoes improprias apos no-show.

3. Evolucao visual da aba de consultas
- novo bloco de indicadores operacionais com selecao rapida:
  - janelas de 7 / 14 / 30 dias
- leitura consolidada de no-show, cancelamentos, retornos e taxas operacionais.

4. Cobertura automatizada
- testes unitarios ampliados do `AppointmentsService` para cobrir:
  - consolidacao de metricas por periodo
  - validacao de range invalido

## Arquivos-chave

- `apps/api/src/appointments/appointments.controller.ts`
- `apps/api/src/appointments/appointments.service.ts`
- `apps/api/src/appointments/dto/appointments-metrics-query.dto.ts`
- `apps/api/src/appointments/appointments.service.spec.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-5/BACKLOG-SPRINT-5.md`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`
