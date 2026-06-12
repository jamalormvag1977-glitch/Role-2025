import { NextResponse } from 'next/server';
import { put, head, del } from '@vercel/blob';
import { writeFile, readdir, unlink, mkdirSync } from 'fs/promises';
import { writeFileSync } from 'fs';
import path from 'path';

const BLOB_KEY = 'dashboard/data.xlsx';
const UPLOAD_DIR = '/home/z/my-project/upload';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Le fichier doit être un fichier Excel (.xlsx ou .xls)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Try Vercel Blob first (production), fallback to local filesystem (dev)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      // === Vercel Blob (Production) ===
      // Delete existing blob if any
      try {
        const existing = await head(BLOB_KEY);
        if (existing) {
          await del(BLOB_KEY);
        }
      } catch {
        // No existing blob, that's fine
      }

      // Upload new file to Vercel Blob
      await put(BLOB_KEY, buffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } else {
      // === Local filesystem (Development) ===
      try { mkdirSync(UPLOAD_DIR, { recursive: true }); } catch {}

      // Remove existing xlsx files
      const existingFiles = await readdir(UPLOAD_DIR);
      for (const f of existingFiles) {
        if (f.endsWith('.xlsx') || f.endsWith('.xls')) {
          await unlink(path.join(UPLOAD_DIR, f)).catch(() => {});
        }
      }

      // Save with original name and as data.xlsx
      const filePath = path.join(UPLOAD_DIR, file.name);
      await writeFile(filePath, buffer);
      writeFileSync(path.join(UPLOAD_DIR, 'data.xlsx'), buffer);
    }

    // Invalidate cache
    const { clearCache } = await import('@/lib/cache');
    clearCache();

    return NextResponse.json({
      success: true,
      message: `Fichier "${file.name}" chargé avec succès`,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
