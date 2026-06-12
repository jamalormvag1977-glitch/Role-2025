import { NextResponse } from 'next/server';
import { parseExcel, parseExcelSync } from '@/lib/parse-excel';
import { isCacheInvalidated, markCacheFresh } from '@/lib/cache';

let cachedData: any = null;

function computeAggregations(rows: any[]) {
  const summary = { totalRows: rows.length, totalVolConsom: 0, totalVolFact: 0, totalVolVoleau: 0, totalRedevCult: 0, totalRedevDph: 0, totalRedevTot: 0 };
  const byAGR: Record<string, any> = {};
  const byCult: Record<string, any> = {};
  const bySecteur: Record<string, any> = {};
  const bySource: Record<string, any> = {};
  const bySemestre: Record<string, any> = {};
  const byClient: Record<string, any> = {};
  const byCDA: Record<string, any> = {};

  for (const row of rows) {
    summary.totalVolConsom += row.VOL_CONSOM;
    summary.totalVolFact += row.VOL_FACT;
    summary.totalVolVoleau += row.VOL_VOLEAU || 0;
    summary.totalRedevCult += row.REDEV_CULT;
    summary.totalRedevDph += row.REDEV_DPH;
    summary.totalRedevTot += row.REDEV_TOT;

    if (!byAGR[row.AGR]) byAGR[row.AGR] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0 };
    byAGR[row.AGR].volConsom += row.VOL_CONSOM; byAGR[row.AGR].volFact += row.VOL_FACT;
    byAGR[row.AGR].redevTot += row.REDEV_TOT; byAGR[row.AGR].redevCult += row.REDEV_CULT;
    byAGR[row.AGR].redevDph += row.REDEV_DPH; byAGR[row.AGR].count += 1;

    if (!byCult[row.CULT]) byCult[row.CULT] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0 };
    byCult[row.CULT].volConsom += row.VOL_CONSOM; byCult[row.CULT].volFact += row.VOL_FACT;
    byCult[row.CULT].redevTot += row.REDEV_TOT; byCult[row.CULT].count += 1;

    if (!bySecteur[row.SECTEUR]) bySecteur[row.SECTEUR] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0 };
    bySecteur[row.SECTEUR].volConsom += row.VOL_CONSOM; bySecteur[row.SECTEUR].volFact += row.VOL_FACT;
    bySecteur[row.SECTEUR].redevTot += row.REDEV_TOT; bySecteur[row.SECTEUR].count += 1;

    if (!bySource[row.SOURCE]) bySource[row.SOURCE] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0 };
    bySource[row.SOURCE].volConsom += row.VOL_CONSOM; bySource[row.SOURCE].volFact += row.VOL_FACT;
    bySource[row.SOURCE].redevTot += row.REDEV_TOT; bySource[row.SOURCE].count += 1;

    if (!bySemestre[row.SEMESTRE]) bySemestre[row.SEMESTRE] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0 };
    bySemestre[row.SEMESTRE].volConsom += row.VOL_CONSOM; bySemestre[row.SEMESTRE].volFact += row.VOL_FACT;
    bySemestre[row.SEMESTRE].redevTot += row.REDEV_TOT; bySemestre[row.SEMESTRE].count += 1;

    const clientKey = String(row.CLIENT);
    if (!byClient[clientKey]) byClient[clientKey] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, agr: row.AGR, secteur: row.SECTEUR, cult: row.CULT };
    byClient[clientKey].volConsom += row.VOL_CONSOM; byClient[clientKey].volFact += row.VOL_FACT;
    byClient[clientKey].redevTot += row.REDEV_TOT; byClient[clientKey].redevCult += row.REDEV_CULT;
    byClient[clientKey].redevDph += row.REDEV_DPH; byClient[clientKey].count += 1;

    const cdaKey = String(row.CDA);
    if (!byCDA[cdaKey]) byCDA[cdaKey] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0 };
    byCDA[cdaKey].volConsom += row.VOL_CONSOM; byCDA[cdaKey].volFact += row.VOL_FACT;
    byCDA[cdaKey].redevTot += row.REDEV_TOT; byCDA[cdaKey].redevCult += row.REDEV_CULT;
    byCDA[cdaKey].redevDph += row.REDEV_DPH; byCDA[cdaKey].count += 1;
  }

  return { summary, byAGR, byCult, bySecteur, bySource, bySemestre, byClient, byCDA };
}

export async function GET(request: Request) {
  try {
    if (!cachedData || isCacheInvalidated()) {
      // Use async version (supports Vercel Blob) with sync fallback (local dev)
      try {
        cachedData = await parseExcel();
      } catch {
        cachedData = parseExcelSync();
      }
      markCacheFresh();
    }

    // Server-side filtering via query params
    const { searchParams } = new URL(request.url);
    const agr = searchParams.get('agr');
    const secteur = searchParams.get('secteur');
    const source = searchParams.get('source');
    const cult = searchParams.get('cult');
    const campagne = searchParams.get('campagne');
    const semestre = searchParams.get('semestre');

    let filtered = cachedData.rows;
    if (agr) filtered = filtered.filter((r: any) => r.AGR === agr);
    if (secteur) filtered = filtered.filter((r: any) => r.SECTEUR === secteur);
    if (source) filtered = filtered.filter((r: any) => r.SOURCE === source);
    if (cult) filtered = filtered.filter((r: any) => r.CULT === cult);
    if (campagne) filtered = filtered.filter((r: any) => r.CAMPAGNE === campagne);
    if (semestre) filtered = filtered.filter((r: any) => r.SEMESTRE === semestre);

    // Compute aggregations from filtered data
    const agg = computeAggregations(filtered);

    // Keep only top 200 clients to reduce payload
    const byClientTop: Record<string, any> = {};
    const sortedClients = Object.entries(agg.byClient)
      .filter(([k]) => k !== '0' && k !== 'NaN')
      .sort(([,a]: [string, any],[,b]: [string, any]) => (b as any).redevTot - (a as any).redevTot);
    for (const [key, val] of sortedClients.slice(0, 200)) {
      byClientTop[key] = val;
    }

    // NO rows in response - only aggregations (keeps payload under 4MB for Vercel)
    const responseData = {
      filters: cachedData.filters,
      summary: agg.summary,
      byAGR: agg.byAGR,
      byCult: agg.byCult,
      bySecteur: agg.bySecteur,
      bySource: agg.bySource,
      bySemestre: agg.bySemestre,
      byClient: byClientTop,
      byCDA: agg.byCDA,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
