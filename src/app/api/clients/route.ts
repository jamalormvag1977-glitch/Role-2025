import { NextResponse } from 'next/server';
import { parseExcel, parseExcelSync } from '@/lib/parse-excel';
import { isCacheInvalidated, markCacheFresh } from '@/lib/cache';

let cachedClients: any = null;

async function getClientData() {
  if (!cachedClients || isCacheInvalidated()) {
    let data;
    try {
      data = await parseExcel();
    } catch {
      data = parseExcelSync();
    }

    // Build per-client aggregations from rows, with AGR/Secteur/Source/Cult info
    const byClient: Record<string, any> = {};
    for (const row of data.rows) {
      const clientKey = String(row.CLIENT);
      if (clientKey === '0' || clientKey === 'NaN') continue;
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          id: clientKey,
          agr: row.AGR,
          secteur: row.SECTEUR,
          cult: row.CULT,
          source: row.SOURCE,
          count: 0,
          volConsom: 0,
          volFact: 0,
          redevCult: 0,
          redevDph: 0,
          redevTot: 0,
        };
      }
      byClient[clientKey].count += 1;
      byClient[clientKey].volConsom += row.VOL_CONSOM;
      byClient[clientKey].volFact += row.VOL_FACT;
      byClient[clientKey].redevCult += row.REDEV_CULT;
      byClient[clientKey].redevDph += row.REDEV_DPH;
      byClient[clientKey].redevTot += row.REDEV_TOT;
    }

    cachedClients = Object.values(byClient)
      .filter((c: any) => c.count > 0)
      .sort((a: any, b: any) => b.redevTot - a.redevTot);

    markCacheFresh();
  }
  return cachedClients;
}

export async function GET(request: Request) {
  try {
    const allClients = await getClientData();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';

    // Global filters from dashboard
    const agr = searchParams.get('agr');
    const secteur = searchParams.get('secteur');
    const source = searchParams.get('source');
    const cult = searchParams.get('cult');

    let filtered = allClients;

    // Apply global filters
    if (agr && agr !== 'all') {
      filtered = filtered.filter((c: any) => c.agr === agr);
    }
    if (secteur && secteur !== 'all') {
      filtered = filtered.filter((c: any) => c.secteur === secteur);
    }
    if (source && source !== 'all') {
      filtered = filtered.filter((c: any) => c.source === source);
    }
    if (cult && cult !== 'all') {
      filtered = filtered.filter((c: any) => c.cult === cult);
    }

    // Apply text search
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
