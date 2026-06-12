import { NextResponse } from 'next/server';
import { parseExcelSync } from '@/lib/parse-excel';
import { isCacheInvalidated, markCacheFresh } from '@/lib/cache';

let cachedData: any = null;

export async function GET() {
  try {
    if (cachedData && !isCacheInvalidated()) {
      return NextResponse.json(cachedData);
    }

    const data = parseExcelSync();
    cachedData = data;
    markCacheFresh();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
