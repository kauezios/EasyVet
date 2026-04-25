# Backlog Planejado - Sprint 4

Periodo sugerido: 2026-06-18 a 2026-07-01
Status: Em andamento
Owner: Agente Orquestrador

## Objetivo da sprint

Aprimorar continuidade do cuidado clinico com foco em remarcacao operacional, retornos programados e fluxo de agenda sem friccao.

## Backlog

| ID | Historia | Owner principal | Prioridade | Estimativa | Status | Criterio de aceite |
|---|---|---|---|---|---|---|
| EV-S4-001 | Remarcacao assistida na agenda diaria | Frontend | Alta | 5 pts | Concluido | Recepcao remarca consulta com visualizacao de horarios livres e bloqueios |
| EV-S4-002 | Agendamento de retorno a partir do prontuario | Frontend | Alta | 3 pts | Concluido | Veterinario abre fluxo de retorno ja com paciente e data sugerida preenchidos |
| EV-S4-003 | Auditoria de mudancas de horario de consulta | Backend | Media | 5 pts | Concluido | Toda remarcacao gera evento auditavel com horario anterior e novo |
| EV-S4-004 | Atalho de retorno com criacao em 1 clique | Backend + Frontend | Media | 5 pts | Pendente | Sistema cria consulta de retorno automaticamente a partir do prontuario finalizado |

## Dependencias

- EV-S4-002 depende de EV-S4-001
- EV-S4-003 complementa EV-S3-004 e EV-S3-005
- EV-S4-004 depende de EV-S4-002
