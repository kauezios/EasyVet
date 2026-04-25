# Sprint 5 - Entrega Iteracao 02

Data: 2026-04-24
Status: Concluida

## Escopo entregue nesta iteracao

1. EV-S5-003 - Tendencia semanal de no-show e cancelamento
- novo endpoint:
  - `GET /api/v1/appointments/metrics/weekly?dateTo=YYYY-MM-DD&weeks=2..12`
- consolidacao semanal no backend:
  - total de consultas por semana
  - no-show e cancelamentos por semana
  - taxa de no-show e taxa de cancelamento por semana
- validacao de janela semanal:
  - `APPOINTMENT_WEEKLY_TREND_INVALID_WEEKS`
- painel de tendencia semanal na aba de consultas:
  - selecao de janela em 4, 6, 8 ou 12 semanas
  - leitura visual da evolucao semanal com destaque de volume e taxas

2. EV-S5-004 - Alertas de retorno abaixo da meta operacional
- evolucao da configuracao de clinica:
  - novo campo `returnRateTargetPercent` em `ClinicScheduleSettings`
  - suporte no endpoint de configuracoes (`GET/PATCH /clinic-settings/schedule`)
- painel de alerta operacional:
  - compara taxa de retorno atual da janela com meta configurada
  - destaca estado "Abaixo da meta" com recomendacao operacional
  - informa quando a meta esta atendida

3. Evolucoes de modelo de dados
- schema Prisma atualizado com:
  - `ClinicScheduleSettings.returnRateTargetPercent` (default `35`)
- nova migracao:
  - `20260424191500_add_return_rate_target_to_clinic_settings`

4. Cobertura automatizada
- testes unitarios ampliados em `AppointmentsService` para cobrir:
  - tendencia semanal consolidada
  - validacao de janela semanal invalida
  - taxa de retorno em metricas consolidadas

## Arquivos-chave

- `apps/api/src/appointments/appointments.controller.ts`
- `apps/api/src/appointments/appointments.service.ts`
- `apps/api/src/appointments/appointments.service.spec.ts`
- `apps/api/src/appointments/dto/appointments-weekly-trend-query.dto.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260424191500_add_return_rate_target_to_clinic_settings/migration.sql`
- `apps/api/src/clinic-settings/clinic-settings.service.ts`
- `apps/api/src/clinic-settings/dto/update-clinic-schedule-settings.dto.ts`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`

## Validacoes executadas

- `pnpm --filter api prisma:generate`
- `pnpm --filter api lint`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api build`
- `pnpm --filter web lint`
- `pnpm --filter web build`
- `curl.exe -I http://127.0.0.1:3000`
