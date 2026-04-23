# Sprint 1 - Entrega Iteracao 03

Data: 2026-04-23
Status: Concluida

## Escopo entregue nesta iteracao

1. Inicio e finalizacao de prontuario (EV-S1-005, EV-S1-006)
- novo model `MedicalRecord` no Prisma com status (`DRAFT`, `FINALIZED`)
- endpoints:
  - `POST /api/v1/appointments/:appointmentId/medical-record/start`
  - `GET /api/v1/appointments/:appointmentId/medical-record`
  - `PUT /api/v1/appointments/:appointmentId/medical-record/draft`
  - `PUT /api/v1/appointments/:appointmentId/medical-record/finalize`
- validacao de campos obrigatorios na finalizacao
- ao finalizar prontuario, consulta vai para status `COMPLETED`

2. Tela de prontuario integrada a agenda (EV-S1-007)
- fluxo de abrir prontuario direto da linha da consulta
- formulario com salvar rascunho e finalizar
- modo demonstracao com dados prontos para validar UI/fluxo mesmo sem backend disponivel
- fallback com timeout de requisicao para ativar demo automaticamente quando API nao responde

## Arquivos-chave

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260423180000_add_medical_records/migration.sql`
- `apps/api/src/medical-records/medical-records.controller.ts`
- `apps/api/src/medical-records/medical-records.service.ts`
- `apps/web/src/app/page.tsx`
- `docs/sprint-1/BACKLOG-SPRINT-1.md`

## Validacoes executadas

- `pnpm --filter api lint`
- `pnpm --filter api build`
- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter web lint`
- `pnpm --filter web build`

## Observacao de ambiente

- O backend local depende de PostgreSQL em `localhost:5432`.
- Quando a API nao responde, a interface ativa automaticamente o modo demonstracao no frontend.
