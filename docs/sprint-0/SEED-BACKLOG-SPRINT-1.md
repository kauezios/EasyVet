# Seed Backlog - Sprint 1

Objetivo da Sprint 1: iniciar implementacao do nucleo operacional do MVP (cadastro + agenda + base de prontuario).

## Itens candidatos priorizados

| ID | Historia | Owner sugerido | Prioridade | Dependencias |
|---|---|---|---|---|
| EV-S1-001 | Como recepcao, quero cadastrar tutor para vincular atendimentos | Backend + Frontend | Alta | Modelo de dados final |
| EV-S1-002 | Como recepcao, quero cadastrar paciente com dados basicos | Backend + Frontend | Alta | EV-S1-001 |
| EV-S1-003 | Como recepcao, quero agendar consulta por veterinario e horario | Backend + Frontend | Alta | EV-S1-001, EV-S1-002 |
| EV-S1-004 | Como veterinario, quero abrir consulta e iniciar prontuario | Backend + Frontend | Alta | EV-S1-003 |
| EV-S1-005 | Como veterinario, quero finalizar prontuario com orientacoes | Backend + Frontend | Alta | EV-S1-004 |
| EV-S1-006 | Como admin, quero controlar perfil de acesso por usuario | Backend | Media | Matriz RBAC |
| EV-S1-007 | Como equipe, quero ver historico de consultas por paciente | Backend + Frontend | Media | EV-S1-005 |
| EV-S1-008 | Como time tecnico, quero logs e auditoria dos eventos clinicos | Backend + DevOps | Alta | Baseline LGPD |
| EV-S1-009 | Como time de qualidade, quero regressao dos fluxos principais | QA | Alta | EV-S1-001 ate EV-S1-008 |

## Criterios de entrada para planejamento da Sprint 1

- Historias com aceite objetivo
- Contratos de API definidos
- Matriz de permissao pronta
- Riscos altos com mitigacao registrada
