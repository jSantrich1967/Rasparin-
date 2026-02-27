# Tarjeteando

App web (responsive) para controlar operaciones de **cash advance indirecto** en Venezuela usando tarjetas de crédito.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind
- Prisma ORM + PostgreSQL
- Auth: NextAuth (Credentials) — **usuario único**
- Validación: Zod
- Charts: Recharts
- Tests: Vitest

## Reglas de negocio (resumen)
- **Deuda VES** por operación: `round2(usdCharged * bcvRateOnCharge)`
- Fees separados:
  - bank fee (default 1.5%)
  - merchant fee (default 1%)
  - efectivo neto recibido en USD = `usdCharged - fees`
- Conciliación por **Allocation** (pago en VES aplicado a operaciones de la misma tarjeta).
- Ganancia:
  - **Realizada**: basada en allocations (USD equivalente pagado)
  - **No realizada**: para OPEN, usando BCV de la **última tasa cargada para la fecha de la operación** (pendiente de implementar en dashboard)

## Setup local

### 1) Variables de entorno
Copia `.env.example` a `.env` y ajusta:
- `NEXTAUTH_SECRET`
- `APP_USERNAME` / `APP_PASSWORD`

### 2) Base de datos (PostgreSQL)

Puedes usar Postgres local (Docker) o un proveedor como **Neon**.

**Neon recomendado (Vercel):** usa dos URLs:
- `DATABASE_URL` (puede ser pooler)
- `DIRECT_URL` (direct connection, sin pooler) para migraciones Prisma

Hay un `docker-compose.yml` listo para DB local si lo prefieres.

1. Asegúrate de tener **Docker Desktop** corriendo.
2. Levanta la DB:

```bash
docker compose up -d
```

> Nota: si Docker no está disponible, puedes usar un Postgres local y apuntar `DATABASE_URL`.

### 3) Prisma
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4) Correr
```bash
pnpm dev
```

Abre: http://localhost:3000

## Tests
```bash
pnpm test
```

## Scripts útiles
- `pnpm prisma:studio`
- `pnpm test:watch`

## Estado actual (MVP en progreso)
- Auth (login) ✅
- Dashboard placeholder ✅
- Cálculos base (fees/deuda/ROI) ✅ + tests ✅
- Modelo Prisma ✅
- Conciliación (server) ✅ (falta UI)

