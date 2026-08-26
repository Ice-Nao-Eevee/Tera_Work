import { NextResponse } from 'next/server';
import { connectDB, getMemoryStore } from '@/lib/db';
import { PromoModel } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      const promos = await PromoModel.find({ isActive: true }).lean();
      if (promos.length > 0) {
        return NextResponse.json({ promos });
      }
    }
  } catch (err) {
    console.log('Using memory store fallback for /api/promos');
  }

  const store = getMemoryStore();
  return NextResponse.json({ promos: store.promos });
}
