/**
 * lib/prisma.ts — Next.js-safe Prisma Client singleton.
 *
 * In development, hot-reload would create a new PrismaClient on every module
 * re-evaluation, exhausting the connection pool. The global trick prevents that.
 *
 * PrismaClient is created lazily (on first access) so that importing this
 * module at build time does NOT attempt a database connection — which would
 * cause Vercel build failures when DATABASE_URL is unavailable at build time.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    // Log pure query execution times to terminal for performance monitoring
    (client as any).$on('query', (e: { duration: number; query: string }) => {
      // Truncate overly long queries for clean terminal output
      const queryPreview = e.query.length > 80 ? `${e.query.substring(0, 80)}...` : e.query;
      console.log(`⏱️ [Prisma] ${e.duration}ms - ${queryPreview}`);
    });
  }

  return client;
}

// Lazily get (or create) the singleton — no connection is made until the
// returned client is actually used in a query.
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Default export: a Proxy that defers client creation until the first property
// access, so `import prisma from '@/lib/prisma'` still works everywhere without
// touching the DB at module-evaluation time (i.e. during `next build`).
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});

export default prisma;

