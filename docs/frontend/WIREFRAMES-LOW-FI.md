# Wireframes Low-Fi - EasyVet (Web)

Versao: 1.0
Data: 2026-04-23
Owner: Agente Frontend Web

## Tela 1 - Agenda do dia

```text
+-----------------------------------------------------------+
| EasyVet | Agenda do Dia | Busca paciente [___________]    |
+-----------------------------------------------------------+
| 08:00 | Thor | Vacina         | Vet: Dra Ana | [Abrir]    |
| 08:30 | Nina | Retorno        | Vet: Dr Leo  | [Abrir]    |
| 09:00 | Slot livre                               [Novo]    |
+-----------------------------------------------------------+
| [Novo agendamento] [Ver historico] [Dashboard]            |
+-----------------------------------------------------------+
```

## Tela 2 - Cadastro rapido (Tutor + Paciente)

```text
+------------------------ Cadastro --------------------------+
| Tutor: Nome [________] Documento [____] Telefone [____]   |
| Paciente: Nome [_____] Especie [____] Raca [____] Sexo[_] |
| Nascimento [__/__/____] Peso [____]                        |
|                                      [Salvar] [Cancelar]   |
+------------------------------------------------------------+
```

## Tela 3 - Atendimento e prontuario

```text
+------------------- Atendimento: Consulta #123 -------------+
| Paciente: Thor | Tutor: Maria | Vet: Dra Ana               |
+-------------------------------------------------------------+
| Anamnese: [______________________________________________]  |
| Exame fisico: [__________________________________________]  |
| Diagnostico: [___________________________________________]  |
| Conduta: [_______________________________________________]  |
| Orientacoes: [___________________________________________]  |
| Retorno: [__/__/____]                                      |
|                         [Salvar rascunho] [Finalizar]       |
+-------------------------------------------------------------+
```

## Tela 4 - Historico do paciente

```text
+---------------- Historico: Thor ----------------------------+
| 2026-04-22 | Consulta retorno | Prontuario [Ver]           |
| 2026-03-10 | Vacinacao        | Prontuario [Ver]           |
| 2026-01-17 | Clinica geral    | Prontuario [Ver]           |
+-------------------------------------------------------------+
```

## Observacoes de UX operacional

- A agenda e a tela principal de entrada.
- Fluxo de cadastro deve exigir o menor numero de campos no inicio.
- Prontuario precisa de salvamento em rascunho para reduzir perda de dados.
