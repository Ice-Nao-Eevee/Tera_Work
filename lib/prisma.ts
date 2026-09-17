/**
 * lib/prisma.ts — Next.js-safe Prisma Client singleton.
 *
 * In development, hot-reload would create a new PrismaClient on every module
 * re-evaluation, exhausting the connection pool. The global trick prevents that.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
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
  globalForPrisma.prisma = prisma;

  // Log pure query execution times to terminal for performance monitoring
  (prisma as any).$on('query', (e: { duration: number; query: string }) => {
    // Truncate overly long queries for clean terminal output
    const queryPreview = e.query.length > 80 ? `${e.query.substring(0, 80)}...` : e.query;
    console.log(`⏱️ [Prisma] ${e.duration}ms - ${queryPreview}`);
  });
}

export default prisma;

