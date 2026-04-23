# Estrategia DevOps, CI/CD e Ambientes - EasyVet

Versao: 1.0
Data: 2026-04-23
Owner: Agente DevOps

## Objetivo

Garantir entrega previsivel com qualidade, rastreabilidade e rollback.

## Ambientes

- local: desenvolvimento com Docker Compose
- dev: ambiente compartilhado para integracao continua
- staging: homologacao pre-producao
- prod: ambiente de clientes

## Branching model

- `main`: branch estavel
- `codex/<tema>`: branches de trabalho
- merge por PR com review minimo de 1 aprovacao

## Pipeline minima (por PR)

1. install
2. lint
3. unit-tests
4. build
5. security-scan (dependencias)

## Pipeline de deploy

- merge em `main` publica em `dev`
- tag de release publica em `staging`
- aprovacao manual publica em `prod`

## Observabilidade minima

- logs estruturados por servico
- correlation id em logs e respostas
- dashboard com erros 4xx/5xx e latencia

## Backup e recuperacao

- backup diario de banco
- retencao minima de 30 dias
- teste de restauracao mensal

## SLO inicial sugerido

- disponibilidade API: 99.5%
- tempo de resposta p95: < 500ms em consultas comuns
