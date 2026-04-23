# Baseline LGPD e Seguranca - EasyVet

Versao: 1.0
Data: 2026-04-23

## Objetivo

Definir controles minimos de privacidade e seguranca para o MVP v1.

## Dados sensiveis tratados

- Dados de tutores (identificacao e contato)
- Dados clinicos de pacientes
- Dados de usuarios internos

## Controles obrigatorios para MVP

1. Autenticacao forte
- senha com hash robusto
- politica minima de senha

2. Autorizacao por perfil (RBAC)
- recepcao, veterinario, administrador
- menor privilegio por default

3. Trilha de auditoria
- registrar leitura e alteracao de prontuario
- registrar alteracoes de permissao de usuario

4. Protecao de dados em transito e repouso
- TLS obrigatorio em producao
- backup criptografado

5. Retencao e descarte
- politica documentada por tipo de dado
- exclusao logica com trilha de auditoria

## Direitos LGPD (direcionamento inicial)

- consulta de dados por titular
- correcao de dados cadastrais
- registro de solicitacoes e resposta

## Itens que exigem validacao juridica externa

- base legal especifica por fluxo
- prazo final de retencao por categoria
- texto final de politicas e termos

## Checklist de go-live minimo

- perfis de acesso ativos e revisados
- logs de auditoria funcionando
- backup e restauracao testados
- politica de incidente definida
