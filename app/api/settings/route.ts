import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SettingsModel } from '@/lib/models';
import { STATIC_SETTINGS } from '@/lib/staticData';

// GET /api/settings — fetch the singleton settings document
export async function GET() {
  try {
    await connectDB();
    let settings = await SettingsModel.findOne().lean();
    // If no settings document exists yet, return the defaults
    if (!settings) {
      settings = STATIC_SETTINGS as any;
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Gagal memuat pengaturan' }, { status: 500 });
  }
}

// PUT /api/settings — update the singleton settings document
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const settings = await SettingsModel.findOneAndUpdate(
      {},
      body,
      { new: true, upsert: true, runValidators: true }
    ).lean();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
