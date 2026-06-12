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

    // Optimize: for byClient, only keep top 500 by redevTot to reduce payload
    // Full client data can be fetched via /api/clients if needed
    const byClientFull = data.byClient;
    const byClientTop: Record<string, any> = {};
    const sortedClients = Object.entries(byClientFull)
      .sort(([,a]: [string, any],[,b]: [string, any]) => (b as any).redevTot - (a as any).redevTot);

    // Keep top 500 clients for dashboard display
    for (const [key, val] of sortedClients.slice(0, 500)) {
      byClientTop[key] = val;
    }

    // Optimize rows: remove rows that are only needed for raw data export
    // Keep essential fields for client-side filtering
    const slimRows = data.rows.map((r: any) => ({
      AGR: r.AGR,
      SECTEUR: r.SECTEUR,
      SOURCE: r.SOURCE,
      CDA: r.CDA,
      CLIENT: r.CLIENT,
      CULT: r.CULT,
      CAMPAGNE: r.CAMPAGNE,
      VOL_CONSOM: r.VOL_CONSOM,
      VOL_FACT: r.VOL_FACT,
      REDEV_CULT: r.REDEV_CULT,
      REDEV_DPH: r.REDEV_DPH,
      REDEV_TOT: r.REDEV_TOT,
      SEMESTRE: r.SEMESTRE,
    }));

    const optimizedData = {
      rows: slimRows,
      filters: data.filters,
      summary: data.summary,
      byAGR: data.byAGR,
      byCult: data.byCult,
      bySecteur: data.bySecteur,
      bySource: data.bySource,
      bySemestre: data.bySemestre,
      byAGRSemestre: data.byAGRSemestre,
      byCultAGR: data.byCultAGR,
      bySecteurAGR: data.bySecteurAGR,
      byClient: byClientTop,
      byCDA: data.byCDA,
    };

    cachedData = optimizedData;
    markCacheFresh();

    return NextResponse.json(optimizedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
