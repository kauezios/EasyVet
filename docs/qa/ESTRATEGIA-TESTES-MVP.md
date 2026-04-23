# Estrategia de Testes - MVP EasyVet

Versao: 1.0
Data: 2026-04-23
Owner: Agente QA

## Objetivo

Garantir que os fluxos criticos de cadastro, agenda e prontuario funcionem com seguranca e sem regressao.

## Tipos de teste

1. Unitario
- regras de validacao
- regras de permissao
- regras de finalizacao de prontuario

2. Integracao
- API + banco nas entidades principais
- fluxo de agendamento e fechamento de consulta

3. E2E
- cadastro tutor/paciente
- agendamento
- atendimento e finalizacao de prontuario
- consulta de historico

## Cenarios criticos obrigatorios

- recepcao nao finaliza prontuario
- veterinario finaliza prontuario com campos minimos
- conflito de horario de agenda retorna erro de negocio
- historico de paciente retorna consultas em ordem cronologica
- leitura/edicao de prontuario gera auditoria

## Criterios de aceite de qualidade para MVP

- 0 falhas criticas abertas em fluxo principal
- cobertura de testes unitarios em regras criticas >= 70%
- cobertura dos 4 fluxos E2E principais >= 100%
- regressao executada antes de release

## Evidencias

- relatorio de execucao de testes por build
- checklist de cenarios manuais criticos
- log de defeitos com severidade e status
