# Arquitetura Inicial - EasyVet

Versao: 1.0
Data: 2026-04-23

## Diretriz principal

Arquitetura API-first: frontend web e app futuro consomem a mesma camada de servicos.

## Blocos principais

1. Frontend Web (operacao de clinica)
2. API Backend (dominio e regras de negocio)
3. Banco relacional PostgreSQL
4. Camada de autenticacao e autorizacao (RBAC)
5. Trilha de auditoria para operacoes sensiveis

## Fronteiras de modulo

- Modulo Cadastro: tutores, pacientes, usuarios
- Modulo Agenda: consultas, status, remarcacoes
- Modulo Prontuario: registros clinicos e historico
- Modulo Seguranca: autenticacao, perfis e permissoes

## Pilares tecnicos

- Contratos de API versionados (`/api/v1`)
- Validacao server-side em toda entrada
- Logs estruturados com correlation-id
- Auditoria para leitura/edicao de prontuario
- Soft delete para entidades sensiveis

## Stack sugerida para inicio

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Banco: PostgreSQL
- Infra inicial: Docker Compose para ambiente local

## Escalabilidade futura

- Extrair modulos por dominio para servicos quando necessario
- Adicionar fila para eventos assicronos
- Habilitar mobile via reaproveitamento total da API
