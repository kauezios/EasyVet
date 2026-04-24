# Backlog Planejado - Sprint 3

Periodo sugerido: 2026-06-04 a 2026-06-17
Status: Em andamento
Owner: Agente Orquestrador

## Objetivo da sprint

Evoluir governanca operacional e rastreabilidade para rotina clinica com foco em controle administrativo e trilha de auditoria acionavel.

## Backlog

| ID | Historia | Owner principal | Prioridade | Estimativa | Status | Criterio de aceite |
|---|---|---|---|---|---|---|
| EV-S3-001 | Ciclo de vida de usuario (ativar/inativar) | Backend + Frontend | Alta | 5 pts | Concluido | Admin consegue ativar/inativar usuario com registro em auditoria |
| EV-S3-002 | Filtros operacionais de auditoria | Frontend | Alta | 3 pts | Concluido | Tela de auditoria filtra por entidade, acao e busca textual |
| EV-S3-003 | Regras de suspensao por inatividade | Backend | Media | 5 pts | Concluido | Job administrativo marca usuarios inativos por politica configurada |
| EV-S3-004 | Painel de seguranca resumido | Frontend | Media | 5 pts | Concluido | Exibir eventos de risco e alertas recentes para admins |
| EV-S3-005 | Exportacao da trilha de auditoria | Frontend | Media | 3 pts | Concluido | Exportar CSV com filtros ativos aplicados |
| EV-S3-006 | Persistencia da politica de inatividade via painel | Backend + Frontend | Media | 5 pts | Concluido | Admin ajusta politica sem depender de variavel de ambiente |

## Dependencias

- EV-S3-004 depende de EV-S3-002
- EV-S3-003 complementa EV-S2-006 e EV-S3-001
- EV-S3-005 depende de EV-S3-002
- EV-S3-006 depende de EV-S3-003
