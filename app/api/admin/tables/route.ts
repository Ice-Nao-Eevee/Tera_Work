import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { generateUniqueTableToken, getAppBaseUrl } from '@/lib/tableToken';

export const dynamic = 'force-dynamic';

const MAX_TABLE_NUMBER = 999;
const MAX_BULK = 100;

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
    console.error('GET /api/admin/tables error:', err);
    return NextResponse.json({ error: 'Gagal memuat meja' }, { status: 500 });
  }
}

// POST /api/admin/tables — { tableNumber } or { from, to } (bulk range)
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const body = await req.json();

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
