# EasyVet

EasyVet e uma plataforma para operacao veterinaria com foco em prontuario digital, agenda clinica e gestao diaria.

## Estado atual

- Sprint 0: concluida (governanca, arquitetura, dados, compliance e backlog).
- Sprint 1: iniciada com base tecnica e primeiro fluxo funcional de cadastro.

## Monorepo

- `apps/api`: API NestJS + Prisma + PostgreSQL
- `apps/web`: Frontend Next.js
- `docs/`: produto, arquitetura, compliance e sprints

## Stack

- Node.js 24+
- pnpm 9+
- NestJS 11
- Prisma 6
- Next.js 16
- PostgreSQL 16 (Docker)

## Rodando localmente

1. Instalar dependencias

```bash
pnpm install
```

2. Subir banco de dados

```bash
docker compose up -d
```

3. Configurar variaveis de ambiente

```bash
# API
cp apps/api/.env.example apps/api/.env

# WEB
cp apps/web/.env.local.example apps/web/.env.local
```

4. Aplicar migrations

```bash
pnpm --filter api prisma:migrate:deploy
```

5. Rodar API e Web

```bash
# terminal 1
pnpm api:dev

# terminal 2
pnpm web:dev
```

- API: `http://localhost:3001/api/v1`
- Web: `http://localhost:3000`

## Scripts uteis

```bash
pnpm lint
pnpm build
pnpm test
pnpm --filter api test:e2e
```

## Artefatos principais

- `docs/agents/AGENT-KIT-EASYVET.md`
- `docs/sprint-0/SPRINT-0-PLANO.md`
- `docs/sprint-0/BACKLOG-SPRINT-0.md`
- `docs/arquitetura/PADRAO-API-V1.md`
- `docs/compliance/MATRIZ-RBAC.md`
- `docs/sprint-1/BACKLOG-SPRINT-1.md`
- `docs/sprint-1/ENTREGA-ITERACAO-01.md`
