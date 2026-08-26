import { NextResponse } from 'next/server';
import { connectDB, getMemoryStore } from '@/lib/db';
import { SettingsModel } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      const settings = await SettingsModel.findOne().lean();
      if (settings) {
        return NextResponse.json({ settings });
      }
    }
  } catch (err) {
    console.log('Using memory store fallback for /api/settings');
  }

  const store = getMemoryStore();
  return NextResponse.json({ settings: store.settings });
}
