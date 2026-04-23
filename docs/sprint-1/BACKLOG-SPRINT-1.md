# Backlog Planejado - Sprint 1

Periodo sugerido: 2026-05-07 a 2026-05-20
Status: Em andamento
Owner: Agente Orquestrador

## Objetivo da sprint

Implementar o nucleo operacional do MVP: cadastro, agenda e prontuario com controle de acesso.

## Backlog

| ID | Historia | Owner principal | Prioridade | Estimativa | Status | Criterio de aceite |
|---|---|---|---|---|---|---|
| EV-S1-001 | Cadastro de tutor | Backend | Alta | 3 pts | Concluido | CRUD de tutor com validacao e auditoria de alteracao |
| EV-S1-002 | Cadastro de paciente | Backend | Alta | 3 pts | Concluido | CRUD de paciente vinculado a tutor |
| EV-S1-003 | Agenda de consultas | Backend | Alta | 5 pts | Concluido | Criar/remarcar consulta sem conflito de horario |
| EV-S1-004 | Tela agenda do dia | Frontend | Alta | 5 pts | Concluido | Lista de consultas do dia com busca e abrir atendimento |
| EV-S1-005 | Inicio de prontuario | Backend | Alta | 5 pts | Concluido | Criar rascunho de prontuario por consulta |
| EV-S1-006 | Finalizacao de prontuario | Backend | Alta | 5 pts | Concluido | Finalizar prontuario com campos obrigatorios e auditoria |
| EV-S1-007 | Tela de prontuario | Frontend | Alta | 8 pts | Concluido | Formulario com salvar rascunho e finalizar |
| EV-S1-008 | RBAC e autenticacao base | Backend | Alta | 5 pts | Concluido | Recepcao nao finaliza prontuario; admin gerencia perfis |
| EV-S1-009 | Testes E2E fluxo principal | QA | Alta | 5 pts | Concluido | Fluxo cadastro->agenda->prontuario validado |
| EV-S1-010 | Pipeline CI minima | DevOps | Media | 3 pts | Pendente | lint/test/build por PR e status no merge |
| EV-S1-011 | Tela de cadastro operacional (tutor/paciente) | Frontend | Alta | 5 pts | Concluido | Cadastro via UI integrado com API v1 |

## Dependencias

- EV-S1-007 depende de EV-S1-005 e EV-S1-006
- EV-S1-009 depende dos itens de fluxo principal
- EV-S1-010 habilita governanca de merge da sprint

## Definicao de pronto

- Criticos de seguranca e fluxo principal sem bugs bloqueantes
- Cenarios E2E principais aprovados
- Logs de auditoria para prontuario ativos
