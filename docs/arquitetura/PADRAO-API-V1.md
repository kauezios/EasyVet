# Padrao de API v1 - EasyVet

Versao: 1.0
Data: 2026-04-23
Owner: Agente Backend

## Convencoes gerais

- Base path: `/api/v1`
- JSON UTF-8 para request/response
- Auth: `Authorization: Bearer <token>`
- Correlation id: header `X-Correlation-Id` (obrigatorio em logs)

## Versionamento

- Versao no path (`/v1`)
- Mudanca breaking gera `/v2`
- Campos novos devem ser additive sempre que possivel

## Contrato de resposta

Sucesso:
```json
{
  "data": {},
  "meta": {
    "correlationId": "uuid"
  }
}
```

Erro:
```json
{
  "error": {
    "code": "PRONTUARIO_VALIDATION_ERROR",
    "message": "Campos obrigatorios ausentes",
    "details": [
      {
        "field": "anamnese.queixa_principal",
        "issue": "required"
      }
    ]
  },
  "meta": {
    "correlationId": "uuid"
  }
}
```

## HTTP status padrao

- 200: consulta/sucesso
- 201: criacao
- 204: atualizacao sem payload
- 400: validacao
- 401: nao autenticado
- 403: sem permissao
- 404: recurso nao encontrado
- 409: conflito de regra
- 422: regra de negocio invalida
- 500: erro interno

## Paginacao padrao

Request:
- `page` (>=1)
- `pageSize` (1..100)

Meta:
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 125,
  "totalPages": 7
}
```

## Idempotencia e consistencia

- Criacao critica pode aceitar `Idempotency-Key`
- Operacoes de finalizacao de prontuario devem prevenir duplicidade

## Eventos de auditoria obrigatorios na API

- prontuario.read
- prontuario.update
- prontuario.finalize
- user.permission.update
