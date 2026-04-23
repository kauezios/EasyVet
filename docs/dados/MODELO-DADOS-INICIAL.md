# Modelo de Dados Inicial - EasyVet

Versao: 1.0
Data: 2026-04-23

## Entidades principais

1. usuario
- id
- nome
- email
- senha_hash
- perfil
- ativo
- criado_em

2. tutor
- id
- nome
- documento
- telefone
- email
- endereco
- criado_em

3. paciente
- id
- tutor_id
- nome
- especie
- raca
- sexo
- data_nascimento
- peso_atual
- criado_em

4. consulta
- id
- paciente_id
- veterinario_id
- inicio_em
- fim_em
- status
- motivo
- criado_em

5. prontuario
- id
- consulta_id
- anamnese
- exame_fisico
- diagnostico
- conduta
- orientacoes
- retorno_sugerido_em
- finalizado_em
- finalizado_por

6. auditoria_evento
- id
- usuario_id
- entidade
- entidade_id
- acao
- payload_resumo
- criado_em

## Relacionamentos

- tutor 1:N paciente
- paciente 1:N consulta
- consulta 1:1 prontuario
- usuario 1:N consulta (veterinario responsavel)
- usuario 1:N auditoria_evento

## Regras de integridade

- prontuario so pode ser finalizado por usuario com perfil veterinario
- consulta finalizada exige prontuario associado
- exclusao de paciente deve ser logica (soft delete)

## Proximos passos de dados (Sprint 1)

1. Definir tipos e constraints SQL detalhados
2. Criar migracoes versionadas
3. Publicar dicionario de dados com campos obrigatorios
