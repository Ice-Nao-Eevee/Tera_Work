/**
 * lib/prisma.ts — Next.js-safe Prisma Client singleton.
 *
 * In development, hot-reload would create a new PrismaClient on every module
 * re-evaluation, exhausting the connection pool.  The global trick prevents that.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var _prismaClient: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global._prismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global._prismaClient = prisma;
}

export default prisma;

