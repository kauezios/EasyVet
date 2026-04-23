# Matriz de Permissoes RBAC - EasyVet

Versao: 1.0
Data: 2026-04-23
Owner: Agente de Seguranca e Compliance

## Perfis

- recepcao
- veterinario
- administrador

## Legenda

- C: criar
- R: ler
- U: atualizar
- D: desativar/excluir logico
- A: aprovar/administrar

## Matriz

| Recurso | Recepcao | Veterinario | Administrador |
|---|---|---|---|
| Tutor | C,R,U | R | C,R,U,D,A |
| Paciente | C,R,U | C,R,U | C,R,U,D,A |
| Consulta (agenda) | C,R,U | R,U | C,R,U,D,A |
| Prontuario | R | C,R,U (do proprio atendimento) | R,A |
| Usuarios | R (basico) | R (basico) | C,R,U,D,A |
| Permissoes/RBAC | - | - | A |
| Auditoria | - | R (proprios eventos) | R,A |

## Regras obrigatorias

- Recepcao nao pode finalizar prontuario.
- Veterinario so finaliza prontuario quando for responsavel da consulta.
- Admin pode bloquear usuario e revisar trilhas de auditoria.
- Acoes sensiveis (RBAC, prontuario finalizado, bloqueio de usuario) exigem evento de auditoria.

## Escopos recomendados para token

- tutor:read, tutor:write
- paciente:read, paciente:write
- consulta:read, consulta:write
- prontuario:read, prontuario:write, prontuario:finalize
- user:admin
- audit:read
