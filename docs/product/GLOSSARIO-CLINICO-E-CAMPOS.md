# Glossario Clinico e Campos Minimos de Prontuario

Versao: 1.0
Data: 2026-04-23
Owner: Agente de Dominio Veterinario

## Objetivo

Padronizar termos clinicos e definir campos obrigatorios para reduzir variacao de registro.

## Glossario base

- tutor: responsavel legal pelo paciente
- paciente: animal atendido na clinica
- anamnese: historico clinico relatado no atendimento atual
- exame_fisico: avaliacao objetiva feita pelo veterinario
- diagnostico_presuntivo: hipotese clinica inicial
- diagnostico_definitivo: confirmacao diagnostica apos exames/avaliacao
- conduta: plano de acao clinica adotado
- prescricao: medicamentos, dose, frequencia e duracao
- retorno: reavaliacao programada

## Campos obrigatorios por secao

## 1) Identificacao do atendimento
- consulta_id
- paciente_id
- veterinario_id
- data_hora_inicio
- motivo_principal

## 2) Anamnese
- queixa_principal
- inicio_sintomas
- evolucao_clinica
- historico_relevante

## 3) Exame fisico
- estado_geral
- temperatura
- frequencia_cardiaca
- frequencia_respiratoria
- hidratacao
- dor_presente (sim/nao)

## 4) Avaliacao clinica
- diagnostico_presuntivo
- exames_solicitados (lista ou "nao se aplica")
- gravidade (baixa/media/alta/critica)

## 5) Conduta e orientacoes
- conduta
- prescricao
- orientacoes_ao_tutor
- retorno_recomendado_em (data ou "nao necessario")

## 6) Fechamento
- status_prontuario (rascunho/finalizado)
- finalizado_por
- finalizado_em

## Regras minimas de preenchimento

- Nao permitir finalizacao sem campos obrigatorios.
- "nao se aplica" deve ser opcao explicita em campos criticos.
- Alteracao apos finalizacao exige motivo e evento de auditoria.
- Todo prontuario finalizado precisa de carimbo de usuario e data/hora.
