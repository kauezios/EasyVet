# Jornadas Criticas - EasyVet

Versao: 1.0
Data: 2026-04-23

## Jornada 1 - Agendamento de consulta

1. Recepcao abre agenda.
2. Busca tutor e paciente ou cria cadastro novo.
3. Seleciona data, horario e veterinario.
4. Registra motivo da consulta.
5. Sistema confirma agendamento.

Resultado esperado: consulta cadastrada e visivel na agenda.

## Jornada 2 - Atendimento clinico e prontuario

1. Veterinario abre consulta agendada.
2. Visualiza historico do paciente.
3. Registra anamnese, exame fisico e conduta.
4. Define orientacoes e retorno.
5. Finaliza prontuario com carimbo de data e usuario.

Resultado esperado: prontuario completo, auditavel e recuperavel.

## Jornada 3 - Consulta de historico e retorno

1. Equipe busca paciente.
2. Visualiza linha do tempo de atendimentos.
3. Reaproveita dados anteriores no novo atendimento.
4. Agenda retorno quando necessario.

Resultado esperado: continuidade clinica com menos retrabalho.

## Eventos criticos para rastreamento

- consulta_criada
- consulta_remarcada
- prontuario_iniciado
- prontuario_finalizado
- retorno_agendado
