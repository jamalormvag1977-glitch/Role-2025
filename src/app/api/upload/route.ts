import { NextResponse } from 'next/server';
import { writeFile, readdir, unlink } from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

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

    // Remove existing xlsx files in upload dir
    const existingFiles = await readdir(UPLOAD_DIR);
    for (const f of existingFiles) {
      if (f.endsWith('.xlsx') || f.endsWith('.xls')) {
        await unlink(path.join(UPLOAD_DIR, f)).catch(() => {});
      }
    }

    // Save with original name
    const filePath = path.join(UPLOAD_DIR, file.name);
    await writeFile(filePath, buffer);

    // Also save as data.xlsx for reliable reading
    const simplePath = path.join(UPLOAD_DIR, 'data.xlsx');
    writeFileSync(simplePath, buffer);

    // Invalidate cache
    const { clearCache } = await import('@/lib/cache');
    clearCache();

    return NextResponse.json({ 
      success: true, 
      message: `Fichier "${file.name}" chargé avec succès`,
      fileName: file.name 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
