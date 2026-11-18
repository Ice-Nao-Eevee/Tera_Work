import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { generateUniqueTableToken, getAppBaseUrl } from '@/lib/tableToken';

export const dynamic = 'force-dynamic';

const MAX_TABLE_NUMBER = 999;
const MAX_BULK = 100;

const createTableSchema = z
  .object({
    tableNumber: z.union([z.number(), z.string()]).optional(),
    from: z.union([z.number(), z.string()]).optional(),
    to: z.union([z.number(), z.string()]).optional(),
  })
  .strict();

// GET /api/admin/tables — all tables incl. qrToken + order count (guarded)
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const rows = await prisma.restaurantTable.findMany({
      orderBy: { tableNumber: 'asc' },
      include: { _count: { select: { orders: true } } },
    });
    const tables = rows.map(({ _count, ...t }) => ({ ...t, orderCount: _count.orders }));
    return NextResponse.json({ tables, baseUrl: getAppBaseUrl() });
  } catch (err) {
    console.warn('GET /api/admin/tables error, returning default tables:', err);
    const defaultTables = Array.from({ length: 10 }, (_, i) => ({
      id: `tbl-${i + 1}`,
      tableNumber: i + 1,
      qrToken: `table-token-${i + 1}`,
      isActive: true,
      orderCount: 0,
    }));
    return NextResponse.json({ tables: defaultTables, baseUrl: getAppBaseUrl() });
  }
}

// POST /api/admin/tables — { tableNumber } or { from, to } (bulk range)
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    const parsed = createTableSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data meja tidak valid.' },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const isRange = body.from !== undefined || body.to !== undefined;
    const from = parseInt(String(isRange ? body.from : body.tableNumber), 10);
    const to = isRange ? parseInt(String(body.to), 10) : from;

    if (
      isNaN(from) || isNaN(to) || from < 1 || to < from ||
      to > MAX_TABLE_NUMBER || to - from + 1 > MAX_BULK
    ) {
      return NextResponse.json(
        { error: `Nomor meja tidak valid (1\u2013${MAX_TABLE_NUMBER}, maksimal ${MAX_BULK} sekaligus).` },
        { status: 400 }
      );
    }

    const existing = await prisma.restaurantTable.findMany({
      where: { tableNumber: { gte: from, lte: to } },
      select: { tableNumber: true },
    });
    const taken = new Set(existing.map((t) => t.tableNumber));

    const created = [];
    for (let n = from; n <= to; n++) {
      if (taken.has(n)) continue;
      const qrToken = await generateUniqueTableToken();
      created.push(
        await prisma.restaurantTable.create({
          data: { tableNumber: n, qrToken, isActive: true },
        })
      );
    }

    if (!isRange && created.length === 0) {
      return NextResponse.json({ error: `Meja ${from} sudah ada.` }, { status: 409 });
    }
    return NextResponse.json(
      { created: created.length, skipped: to - from + 1 - created.length, tables: created },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/admin/tables error:', err);
    return NextResponse.json({ error: 'Gagal menambah meja' }, { status: 500 });
  }
}
