import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminGuard';

const BUCKET = 'menu-photos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (Task E6)

const ALLOWED_TYPES: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Inspects the raw file header (magic bytes) to verify true image format (Task E6).
 * Explicitly rejects SVG/XML/HTML payloads and any format outside JPEG, PNG, WebP.
 */
function detectMimeFromMagicBytes(
  buf: Buffer
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buf || buf.length < 12) return null;

  // Reject XML / SVG / HTML / script masquerading as an image
  const headAscii = buf.subarray(0, 64).toString('utf8').trimStart().toLowerCase();
  if (
    headAscii.startsWith('<svg') ||
    headAscii.startsWith('<?xml') ||
    headAscii.startsWith('<!doctype') ||
    headAscii.startsWith('<html') ||
    headAscii.startsWith('<script')
  ) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && // R
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x46 && // F
    buf[8] === 0x57 && // W
    buf[9] === 0x45 && // E
    buf[10] === 0x42 && // B
    buf[11] === 0x50 // P
  ) {
    return 'image/webp';
  }

  return null;
}

let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error || !data) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: Object.keys(ALLOWED_TYPES),
    });
    if (createError && !/already exists/i.test(createError.message || '')) {
      throw createError;
    }
  }
  bucketReady = true;
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File foto wajib diunggah' }, { status: 400 });
    }

    // Explicitly reject SVG or unsupported MIME types before reading buffer
    const declaredType = (file.type || '').toLowerCase().trim();
    if (!ALLOWED_TYPES[declaredType]) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP (SVG tidak diizinkan).' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran foto maksimal 5MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran foto maksimal 5MB' },
        { status: 400 }
      );
    }

    // Verify magic bytes match an allowed image format and match declared MIME type
    const detectedMime = detectMimeFromMagicBytes(buffer);
    if (!detectedMime || detectedMime !== declaredType) {
      return NextResponse.json(
        { error: 'Isi file tidak valid atau tidak sesuai dengan format gambar (JPG, PNG, WEBP).' },
        { status: 400 }
      );
    }

    const ext = ALLOWED_TYPES[detectedMime];

    await ensureBucket();

    // Generate random filename with UUID — never use original user filename (Task E6)
    const path = `menu/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: detectedMime,
      upsert: false,
    });

    if (uploadError) {
      console.error('POST /api/upload storage error:', uploadError);
      return NextResponse.json({ error: 'Gagal mengunggah foto' }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    return NextResponse.json({ error: 'Gagal mengunggah foto' }, { status: 500 });
  }
}
