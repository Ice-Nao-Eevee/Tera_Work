# Getting Started

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [lib/db.ts](file://lib/db.ts)
- [prisma/schema.prisma](file://prisma/schema.prisma)
- [lib/prisma.ts](file://lib/prisma.ts)
- [next.config.js](file://next.config.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This guide helps you set up the Warkop Betawa restaurant ordering system from scratch. You will install Node.js, set up a database (PostgreSQL via Prisma), configure environment variables, install dependencies, and start the development server. The app is built with Next.js 14/16 and uses Prisma with PostgreSQL for persistence. On first run, the database is automatically seeded with initial categories, menu items, promos, settings, tables, and coupons.

## Project Structure
At a high level:
- Frontend pages and API routes live under `app/`.
- Database schema is defined in `prisma/schema.prisma`.
- Database seeding and Prisma client setup are in `lib/db.ts` and `lib/prisma.ts`.
- Environment configuration is read by Prisma and Next.js at runtime.

```mermaid
graph TB
A["Next.js App<br/>app/*"] --> B["API Routes<br/>app/api/*"]
B --> C["Prisma Client<br/>lib/prisma.ts"]
C --> D["PostgreSQL<br/>DATABASE_URL"]
A --> E["Seeding Logic<br/>lib/db.ts"]
E --> C
F["Schema Definition<br/>prisma/schema.prisma"] --> C
```

**Diagram sources**
- [lib/prisma.ts:1-40](file://lib/prisma.ts#L1-L40)
- [lib/db.ts:1-161](file://lib/db.ts#L1-L161)
- [prisma/schema.prisma:1-107](file://prisma/schema.prisma#L1-L107)

**Section sources**
- [README.md:1-105](file://README.md#L1-L105)
- [package.json:1-42](file://package.json#L1-L42)

## Core Components
- Next.js application with API routes for menu, orders, categories, promos, settings, tables, coupons, chat, and uploads.
- Prisma ORM configured to connect to PostgreSQL using `DATABASE_URL`.
- Automatic seeding on first connection to populate initial data.
- Environment-driven configuration for database connectivity.

Key responsibilities:
- `lib/prisma.ts`: Exposes a singleton Prisma client with safe logging in development.
- `lib/db.ts`: Ensures the database is seeded once per process and provides an in-memory fallback store when needed.
- `prisma/schema.prisma`: Defines all models (categories, menu items, tables, promos, orders, coupons, settings).

**Section sources**
- [lib/prisma.ts:1-40](file://lib/prisma.ts#L1-L40)
- [lib/db.ts:1-161](file://lib/db.ts#L1-L161)
- [prisma/schema.prisma:1-107](file://prisma/schema.prisma#L1-L107)

## Architecture Overview
The app runs as a Next.js server that serves pages and exposes REST-like API routes. All persistent data is stored in PostgreSQL through Prisma. Initial data is created automatically when the app starts and no records exist.

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant Next as "Next.js Dev Server"
participant DBSeed as "DB Seeder<br/>lib/db.ts"
participant Prisma as "Prisma Client<br/>lib/prisma.ts"
participant PG as "PostgreSQL"
Dev->>Next : npm run dev
Next->>DBSeed : connectDB()
DBSeed->>Prisma : prisma.* queries
Prisma->>PG : Connect using DATABASE_URL
PG-->>Prisma : Connection OK
Prisma-->>DBSeed : Query counts / create records
DBSeed-->>Next : Seeded successfully
Next-->>Dev : App running locally
```

**Diagram sources**
- [lib/db.ts:32-50](file://lib/db.ts#L32-L50)
- [lib/prisma.ts:14-25](file://lib/prisma.ts#L14-L25)
- [prisma/schema.prisma:5-9](file://prisma/schema.prisma#L5-L9)

## Detailed Component Analysis

### Step-by-step Installation

#### 1. Install Node.js
- Install Node.js version 18 or newer.
- Verify installation:
  - `node --version`
  - `npm --version`

#### 2. Install Dependencies
From the project root:
- `npm install`

Notes:
- The package scripts include `dev`, `build`, `start`, and `lint`.
- A postinstall script attempts to sync Prisma skills; it is non-fatal if it fails.

**Section sources**
- [README.md:7-10](file://README.md#L7-L10)
- [package.json:6-12](file://package.json#L6-L12)

#### 3. Set Up the Database (PostgreSQL)
The project uses Prisma with PostgreSQL. You need a running PostgreSQL instance and a database URL.

Options:
- Local PostgreSQL server (e.g., installed via your OS package manager, Docker, or a local installer).
- Managed PostgreSQL service (e.g., Supabase, Neon, Railway, Render).

Create a `.env.local` file in the project root with:
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME`
- Optional: `DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME` (used by Prisma for some operations)

Important:
- Do not commit secrets. Use `.env.local` and ensure it is ignored by version control.

Verification:
- Ensure your PostgreSQL server is reachable from your machine.
- Confirm the database user has permissions to create tables and insert data.

**Section sources**
- [prisma/schema.prisma:5-9](file://prisma/schema.prisma#L5-L9)

#### 4. Generate Prisma Client and Apply Schema
Run:
- `npx prisma generate`
- `npx prisma db push` (or use migrations depending on your workflow)

This creates the Prisma client and applies the schema to your database.

**Section sources**
- [prisma/schema.prisma:1-107](file://prisma/schema.prisma#L1-L107)

#### 5. Start the Development Server
Run:
- `npm run dev`

On first startup, the app seeds the database with:
- Categories
- Menu items
- Promos
- Settings (tax and service charge rates)
- Tables 1–10
- Coupons

You can then open the app in your browser at the local development URL printed by the dev server.

**Section sources**
- [README.md:24-40](file://README.md#L24-L40)
- [lib/db.ts:92-159](file://lib/db.ts#L92-L159)

#### 6. Production Configuration
For production:
- Set `DATABASE_URL` in your hosting platform’s environment variables.
- Build the app: `npm run build`
- Start the production server: `npm start`

Ensure your managed PostgreSQL allows connections from your deployment environment.

**Section sources**
- [package.json:6-12](file://package.json#L6-L12)

## Dependency Analysis
The app depends on:
- Next.js for routing, server-side rendering, and API routes.
- Prisma Client for type-safe database access.
- Mongoose and Supabase packages are present but the active persistence layer shown in code is Prisma + PostgreSQL.

```mermaid
graph LR
Next["Next.js"] --> Prisma["@prisma/client"]
Prisma --> Postgres["PostgreSQL"]
Next --> Env[".env.local<br/>DATABASE_URL"]
```

**Diagram sources**
- [package.json:13-29](file://package.json#L13-L29)
- [prisma/schema.prisma:5-9](file://prisma/schema.prisma#L5-L9)

**Section sources**
- [package.json:1-42](file://package.json#L1-L42)

## Performance Considerations
- In development, Prisma logs query events to help monitor performance.
- Avoid excessive reconnections by using the provided Prisma singleton.
- Keep image domains allowed in Next.js config if you host images remotely.

**Section sources**
- [lib/prisma.ts:16-36](file://lib/prisma.ts#L16-L36)
- [next.config.js:1-15](file://next.config.js#L1-L15)

## Troubleshooting Guide

### Common Issues and Fixes

- **Cannot connect to database**
  - Symptom: Errors when starting the app or during seeding.
  - Checks:
    - Verify `DATABASE_URL` points to a reachable PostgreSQL server.
    - Ensure the database exists and credentials are correct.
    - If using a managed provider, confirm network allowlists and firewall rules.

- **Port conflicts**
  - Symptom: Dev server cannot bind to the default port.
  - Fix: Change the port in your environment or stop another process using the same port.

- **Seeding does not run**
  - Symptom: No initial categories, menu items, or tables appear.
  - Checks:
    - Confirm the app calls the seeding function on startup.
    - Check console logs for seed messages.
    - Ensure the database user has write permissions.

- **Environment variables not loaded**
  - Symptom: Runtime errors about missing `DATABASE_URL`.
  - Fix: Create `.env.local` with the correct values and restart the dev server.

- **Image loading issues**
  - Symptom: Remote images fail to load.
  - Fix: Ensure remote image hosts are allowed in Next.js config.

- **Admin panel login**
  - Default admin credentials are documented in the README. Update them in the Settings panel after first login.

**Section sources**
- [README.md:98-105](file://README.md#L98-L105)
- [lib/db.ts:32-50](file://lib/db.ts#L32-L50)
- [lib/prisma.ts:16-36](file://lib/prisma.ts#L16-L36)
- [next.config.js:1-15](file://next.config.js#L1-L15)

## Conclusion
You now have everything needed to run Warkop Betawa locally. Install Node.js, set up PostgreSQL, configure `DATABASE_URL`, install dependencies, generate Prisma client, apply the schema, and start the dev server. The app will seed itself on first run. For production, point `DATABASE_URL` to your managed PostgreSQL instance and deploy using `npm run build` and `npm start`.