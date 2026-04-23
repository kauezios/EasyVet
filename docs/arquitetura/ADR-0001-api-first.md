# ADR-0001 - Estrategia API-first

Data: 2026-04-23
Status: Aceito

## Contexto

EasyVet sera iniciado com interface web, mas tera integracao com aplicativo no futuro. Para evitar duplicacao de regras de negocio, precisamos de uma camada unica de dominio.

## Decisao

Adotar arquitetura API-first desde o inicio, com backend centralizando regras de negocio e contratos versionados consumidos por clientes web e mobile.

## Consequencias positivas

- Reuso de regras no web e mobile
- Menor retrabalho ao iniciar app
- Melhor governanca de integracoes futuras

## Consequencias negativas

- Exige disciplina inicial em contratos de API
- Pode gerar overhead inicial de modelagem

## Alternativas consideradas

1. Web monolitico sem API dedicada (rejeitada)
2. Backend por modulo somente apos crescimento (rejeitada para fase inicial)

## Plano de revisao

Reavaliar esta ADR apos entrega do MVP v1 ou em 2026-09-30, o que ocorrer primeiro.
