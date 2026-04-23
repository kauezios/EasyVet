# Sprint 0 - Riscos e Mitigacoes

Data: 2026-04-23
Owner geral: Agente Orquestrador

| ID | Risco | Impacto | Probabilidade | Owner | Mitigacao | Prazo |
|---|---|---|---|---|---|---|
| R-01 | Escopo do MVP crescer sem validacao | Alto | Alta | Orquestrador | Congelar escopo do MVP v1 ate review final da sprint | 2026-04-24 |
| R-02 | Campos clinicos incompletos no prontuario | Alto | Media | Dominio Veterinario | Fechar glossario e checklist minimo clinico | 2026-04-27 |
| R-03 | Falhas de permissao por perfil | Alto | Media | Seguranca e Compliance | Publicar matriz RBAC e revisar com Produto | 2026-04-28 |
| R-04 | Arquitetura sem padrao de erros de API | Medio | Media | Backend | Definir padrao de erro e contrato de resposta | 2026-04-29 |
| R-05 | Modelo de dados sem constraints criticas | Alto | Media | Dados | Especificar constraints e regras de integridade | 2026-04-29 |
| R-06 | Falta de rastreabilidade de alteracoes clinicas | Alto | Media | Seguranca e Compliance | Definir eventos obrigatorios de auditoria | 2026-04-28 |
| R-07 | Falta de criterio de teste em historias | Medio | Media | QA | Criar template de cenario de aceite | 2026-04-30 |
| R-08 | Pipeline de entrega atrasar inicio da Sprint 1 | Medio | Baixa | DevOps | Definir padrao de branch e pipeline minima | 2026-05-02 |
| R-09 | Dependencia juridica atrasar politicas LGPD | Alto | Media | Seguranca e Compliance | Marcar validacao juridica e adotar baseline provisoria | 2026-05-05 |
| R-10 | Equipe divergir em prioridades tecnicas | Medio | Media | Orquestrador | Review semanal de prioridades e ADR obrigatoria | 2026-04-30 |

## Escalacao

- Riscos de impacto alto e probabilidade alta escalam no mesmo dia.
- Riscos de seguranca ou LGPD bloqueiam release ate mitigacao minima.
