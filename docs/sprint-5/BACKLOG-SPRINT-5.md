# Backlog Planejado - Sprint 5

Periodo sugerido: 2026-07-02 a 2026-07-15
Status: Em andamento
Owner: Agente Orquestrador

## Objetivo da sprint

Evoluir visibilidade operacional da clinica com indicadores de agenda, taxa de no-show e produtividade de retorno para apoiar decisao diaria.

## Backlog

| ID | Historia | Owner principal | Prioridade | Estimativa | Status | Criterio de aceite |
|---|---|---|---|---|---|---|
| EV-S5-001 | Painel de indicadores de consultas por janela temporal | Backend + Frontend | Alta | 5 pts | Concluido | Dashboard exibe metricas de consultas com filtros de 7/14/30 dias |
| EV-S5-002 | Marcacao operacional de no-show na agenda | Frontend | Alta | 3 pts | Concluido | Recepcao consegue marcar consulta como no-show sem sair da grade diaria |
| EV-S5-003 | Tendencia semanal de no-show e cancelamento | Backend + Frontend | Media | 5 pts | Pendente | Sistema exibe evolucao semanal consolidada para suporte de acao gerencial |
| EV-S5-004 | Alertas de retorno abaixo da meta operacional | Frontend | Media | 5 pts | Pendente | Painel destaca quando taxa de retorno ficar abaixo do limite configurado |

## Dependencias

- EV-S5-002 complementa EV-S5-001
- EV-S5-003 depende de EV-S5-001
- EV-S5-004 depende de EV-S5-001 e EV-S5-003
