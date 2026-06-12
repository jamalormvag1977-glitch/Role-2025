import { NextResponse } from 'next/server';
import { parseExcelSync } from '@/lib/parse-excel';
import { isCacheInvalidated } from '@/lib/cache';

let cachedClients: any = null;
let cacheFresh = true;

export async function GET(request: Request) {
  try {
    if (!cacheFresh || isCacheInvalidated()) {
      const data = parseExcelSync();

      // Build lightweight client list sorted by redevTot
      const clients = Object.entries(data.byClient)
        .map(([id, v]: [string, any]) => ({
          id,
          agr: v.agr,
          secteur: v.secteur,
          cult: v.cult,
          count: v.count,
          volConsom: v.volConsom,
          volFact: v.volFact,
          redevCult: v.redevCult,
          redevDph: v.redevDph,
          redevTot: v.redevTot,
        }))
        .filter(c => c.id !== '0' && c.id !== 'NaN' && c.count > 0)
        .sort((a, b) => b.redevTot - a.redevTot);

      cachedClients = clients;
      cacheFresh = true;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';

    let filtered = cachedClients;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((c: any) =>
        c.id.toLowerCase().includes(s) ||
        c.agr.toLowerCase().includes(s) ||
        c.secteur.toLowerCase().includes(s) ||
        c.cult.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return NextResponse.json({
      clients: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
