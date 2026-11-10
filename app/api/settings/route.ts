import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { STATIC_SETTINGS } from '@/lib/staticData';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';

const restaurantInfoSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    address: z.string().trim().max(500).optional(),
    openHours: z.string().trim().max(200).optional(),
    contact: z.string().trim().max(100).optional(),
    wifiPassword: z.string().trim().max(100).optional(),
    announcement: z.string().trim().max(500).optional(),
  })
  .strict();

const updateSettingsSchema = z
  .object({
    taxRatePercent: z.union([z.number(), z.string()]).optional(),
    serviceChargeRatePercent: z.union([z.number(), z.string()]).optional(),
    restaurantInfo: restaurantInfoSchema.optional(),
  })
  .strict();

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

// PUT /api/settings (Admin only)
export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    const parsed = updateSettingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pengaturan tidak valid.' },
        { status: 400 }
      );
    }
    const body = parsed.data;

    if (body.taxRatePercent !== undefined) {
      const tax = Number(body.taxRatePercent);
      if (isNaN(tax) || tax < 0 || tax > 100) {
        return NextResponse.json(
          { error: 'Persentase pajak harus berupa angka antara 0 dan 100' },
          { status: 400 }
        );
      }
    }

    if (body.serviceChargeRatePercent !== undefined) {
      const service = Number(body.serviceChargeRatePercent);
      if (isNaN(service) || service < 0 || service > 100) {
        return NextResponse.json(
          { error: 'Persentase biaya layanan harus berupa angka antara 0 dan 100' },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.settings.findFirst();
    const settings = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: {
            ...(body.taxRatePercent !== undefined && { taxRatePercent: Number(body.taxRatePercent) }),
            ...(body.serviceChargeRatePercent !== undefined && { serviceChargeRatePercent: Number(body.serviceChargeRatePercent) }),
            ...(body.restaurantInfo !== undefined && {
              restaurantInfo: body.restaurantInfo as unknown as Prisma.InputJsonValue,
            }),
          },
        })
      : await prisma.settings.create({
          data: {
            taxRatePercent: body.taxRatePercent !== undefined ? Number(body.taxRatePercent) : STATIC_SETTINGS.taxRatePercent,
            serviceChargeRatePercent: body.serviceChargeRatePercent !== undefined ? Number(body.serviceChargeRatePercent) : STATIC_SETTINGS.serviceChargeRatePercent,
            restaurantInfo: (body.restaurantInfo ?? STATIC_SETTINGS.restaurantInfo) as unknown as Prisma.InputJsonValue,
          },
        });
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
