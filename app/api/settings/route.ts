import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { STATIC_SETTINGS } from '@/lib/staticData';
import prisma from '@/lib/prisma';

// GET /api/settings
export async function GET() {
  try {
    await connectDB();
    let settings = await prisma.settings.findFirst();
    if (!settings) settings = { id: 'static', ...STATIC_SETTINGS } as any;
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Gagal memuat pengaturan' }, { status: 500 });
  }
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const existing = await prisma.settings.findFirst();
    const settings = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: {
            ...(body.taxRatePercent !== undefined && { taxRatePercent: Number(body.taxRatePercent) }),
            ...(body.serviceChargeRatePercent !== undefined && { serviceChargeRatePercent: Number(body.serviceChargeRatePercent) }),
            ...(body.restaurantInfo !== undefined && { restaurantInfo: body.restaurantInfo }),
          },
        })
      : await prisma.settings.create({
          data: {
            taxRatePercent: body.taxRatePercent ?? STATIC_SETTINGS.taxRatePercent,
            serviceChargeRatePercent: body.serviceChargeRatePercent ?? STATIC_SETTINGS.serviceChargeRatePercent,
            restaurantInfo: body.restaurantInfo ?? STATIC_SETTINGS.restaurantInfo,
          },
        });
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
