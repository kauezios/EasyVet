# Backlog Planejado - Sprint 2

Periodo sugerido: 2026-05-21 a 2026-06-03
Status: Em andamento
Owner: Agente Orquestrador

## Objetivo da sprint

Evoluir de base operacional para base de produto seguro: autenticacao real, sessao de usuario, governanca de acesso e primeiros blocos administrativos.

## Backlog

| ID | Historia | Owner principal | Prioridade | Estimativa | Status | Criterio de aceite |
|---|---|---|---|---|---|---|
| EV-S2-001 | Autenticacao real com usuario persistido | Backend | Alta | 5 pts | Concluido | Login com token de acesso, endpoint `/auth/me` e usuarios em base |
| EV-S2-002 | Sessao de acesso na UI | Frontend | Alta | 3 pts | Concluido | Login/logout visivel no workspace com perfil sincronizado |
| EV-S2-003 | Endurecimento RBAC em rotas administrativas | Backend | Alta | 3 pts | Concluido | Perfis administrativos exigem token + role `ADMIN` |
| EV-S2-004 | Tela de gestao de perfis operacionais | Frontend | Media | 5 pts | Concluido | Listar/criar/alterar perfis via API com feedback de erro |
| EV-S2-005 | Auditoria de eventos sensiveis | Backend | Alta | 5 pts | Concluido | Log de autenticacao, alteracao de role e finalizacao de prontuario |
| EV-S2-006 | Hardening de seguranca basico | Backend | Alta | 5 pts | Concluido | Politica de senha, lock de tentativas e expiracao de token configuravel |

## Dependencias

- EV-S2-004 depende de EV-S2-001 e EV-S2-003
- EV-S2-005 depende de EV-S2-001 e EV-S2-003
- EV-S2-006 depende de EV-S2-001
