import { NextResponse } from 'next/server';
import { parseExcel, parseExcelSync } from '@/lib/parse-excel';
import { isCacheInvalidated, markCacheFresh } from '@/lib/cache';

let cachedData: any = null;

function computeAggregations(rows: any[]) {
  const summary = { totalRows: rows.length, totalVolConsom: 0, totalVolFact: 0, totalVolVoleau: 0, totalRedevCult: 0, totalRedevDph: 0, totalRedevTot: 0, totalClientCount: 0 };
  const byAGR: Record<string, any> = {};
  const byCult: Record<string, any> = {};
  const bySecteur: Record<string, any> = {};
  const bySource: Record<string, any> = {};
  const bySemestre: Record<string, any> = {};
  const byClient: Record<string, any> = {};
  const byCDA: Record<string, any> = {};
  // Cross-analysis: AGR x Secteur x Culture
  const byAGRSecteur: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number; count: number; clientCount: number }>> = {};
  const byAGRCult: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number; count: number; clientCount: number }>> = {};
  const bySecteurCult: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number; count: number; clientCount: number }>> = {};

  // Track unique clients per dimension using Sets
  const clientsPerAGR: Record<string, Set<string>> = {};
  const clientsPerCult: Record<string, Set<string>> = {};
  const clientsPerSecteur: Record<string, Set<string>> = {};
  const clientsPerSource: Record<string, Set<string>> = {};
  const clientsPerSemestre: Record<string, Set<string>> = {};
  const clientsPerCDA: Record<string, Set<string>> = {};
  // Cross-analysis client sets
  const clientsPerAGRSecteur: Record<string, Record<string, Set<string>>> = {};
  const clientsPerAGRCult: Record<string, Record<string, Set<string>>> = {};
  const clientsPerSecteurCult: Record<string, Record<string, Set<string>>> = {};
  // Global unique client set
  const allClients = new Set<string>();

  for (const row of rows) {
    summary.totalVolConsom += row.VOL_CONSOM;
    summary.totalVolFact += row.VOL_FACT;
    summary.totalVolVoleau += row.VOL_VOLEAU || 0;
    summary.totalRedevCult += row.REDEV_CULT;
    summary.totalRedevDph += row.REDEV_DPH;
    summary.totalRedevTot += row.REDEV_TOT;

    if (!byAGR[row.AGR]) byAGR[row.AGR] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, clientCount: 0 };
    byAGR[row.AGR].volConsom += row.VOL_CONSOM; byAGR[row.AGR].volFact += row.VOL_FACT;
    byAGR[row.AGR].redevTot += row.REDEV_TOT; byAGR[row.AGR].redevCult += row.REDEV_CULT;
    byAGR[row.AGR].redevDph += row.REDEV_DPH; byAGR[row.AGR].count += 1;
    if (!clientsPerAGR[row.AGR]) clientsPerAGR[row.AGR] = new Set();
    const clientId1 = String(row.CLIENT);
    if (clientId1 !== '0' && clientId1 !== 'NaN') clientsPerAGR[row.AGR].add(clientId1);

    if (!byCult[row.CULT]) byCult[row.CULT] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, clientCount: 0 };
    byCult[row.CULT].volConsom += row.VOL_CONSOM; byCult[row.CULT].volFact += row.VOL_FACT;
    byCult[row.CULT].redevTot += row.REDEV_TOT; byCult[row.CULT].redevCult += row.REDEV_CULT;
    byCult[row.CULT].redevDph += row.REDEV_DPH; byCult[row.CULT].count += 1;
    if (!clientsPerCult[row.CULT]) clientsPerCult[row.CULT] = new Set();
    const clientId2 = String(row.CLIENT);
    if (clientId2 !== '0' && clientId2 !== 'NaN') clientsPerCult[row.CULT].add(clientId2);

    if (!bySecteur[row.SECTEUR]) bySecteur[row.SECTEUR] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, clientCount: 0 };
    bySecteur[row.SECTEUR].volConsom += row.VOL_CONSOM; bySecteur[row.SECTEUR].volFact += row.VOL_FACT;
    bySecteur[row.SECTEUR].redevTot += row.REDEV_TOT; bySecteur[row.SECTEUR].redevCult += row.REDEV_CULT;
    bySecteur[row.SECTEUR].redevDph += row.REDEV_DPH; bySecteur[row.SECTEUR].count += 1;
    if (!clientsPerSecteur[row.SECTEUR]) clientsPerSecteur[row.SECTEUR] = new Set();
    const clientId3 = String(row.CLIENT);
    if (clientId3 !== '0' && clientId3 !== 'NaN') clientsPerSecteur[row.SECTEUR].add(clientId3);

    if (!bySource[row.SOURCE]) bySource[row.SOURCE] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, clientCount: 0 };
    bySource[row.SOURCE].volConsom += row.VOL_CONSOM; bySource[row.SOURCE].volFact += row.VOL_FACT;
    bySource[row.SOURCE].redevTot += row.REDEV_TOT; bySource[row.SOURCE].redevCult += row.REDEV_CULT;
    bySource[row.SOURCE].redevDph += row.REDEV_DPH; bySource[row.SOURCE].count += 1;
    if (!clientsPerSource[row.SOURCE]) clientsPerSource[row.SOURCE] = new Set();
    const clientId4 = String(row.CLIENT);
    if (clientId4 !== '0' && clientId4 !== 'NaN') clientsPerSource[row.SOURCE].add(clientId4);

    if (!bySemestre[row.SEMESTRE]) bySemestre[row.SEMESTRE] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, clientCount: 0 };
    bySemestre[row.SEMESTRE].volConsom += row.VOL_CONSOM; bySemestre[row.SEMESTRE].volFact += row.VOL_FACT;
    bySemestre[row.SEMESTRE].redevTot += row.REDEV_TOT; bySemestre[row.SEMESTRE].redevCult += row.REDEV_CULT;
    bySemestre[row.SEMESTRE].redevDph += row.REDEV_DPH; bySemestre[row.SEMESTRE].count += 1;
    if (!clientsPerSemestre[row.SEMESTRE]) clientsPerSemestre[row.SEMESTRE] = new Set();
    const clientId5 = String(row.CLIENT);
    if (clientId5 !== '0' && clientId5 !== 'NaN') clientsPerSemestre[row.SEMESTRE].add(clientId5);

    const clientKey = String(row.CLIENT);
    if (!byClient[clientKey]) byClient[clientKey] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, agr: row.AGR, secteur: row.SECTEUR, cult: row.CULT };
    byClient[clientKey].volConsom += row.VOL_CONSOM; byClient[clientKey].volFact += row.VOL_FACT;
    byClient[clientKey].redevTot += row.REDEV_TOT; byClient[clientKey].redevCult += row.REDEV_CULT;
    byClient[clientKey].redevDph += row.REDEV_DPH; byClient[clientKey].count += 1;

    const cdaKey = String(row.CDA);
    if (!byCDA[cdaKey]) byCDA[cdaKey] = { volConsom: 0, volFact: 0, redevTot: 0, redevCult: 0, redevDph: 0, count: 0, clientCount: 0 };
    byCDA[cdaKey].volConsom += row.VOL_CONSOM; byCDA[cdaKey].volFact += row.VOL_FACT;
    byCDA[cdaKey].redevTot += row.REDEV_TOT; byCDA[cdaKey].redevCult += row.REDEV_CULT;
    byCDA[cdaKey].redevDph += row.REDEV_DPH; byCDA[cdaKey].count += 1;
    if (!clientsPerCDA[cdaKey]) clientsPerCDA[cdaKey] = new Set();
    const clientId6 = String(row.CLIENT);
    if (clientId6 !== '0' && clientId6 !== 'NaN') clientsPerCDA[cdaKey].add(clientId6);

    // Track global unique clients
    const rowClientId = String(row.CLIENT);
    if (rowClientId !== '0' && rowClientId !== 'NaN') allClients.add(rowClientId);

    // Cross: AGR x Secteur
    if (!byAGRSecteur[row.AGR]) byAGRSecteur[row.AGR] = {};
    if (!byAGRSecteur[row.AGR][row.SECTEUR]) byAGRSecteur[row.AGR][row.SECTEUR] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0, clientCount: 0 };
    byAGRSecteur[row.AGR][row.SECTEUR].volConsom += row.VOL_CONSOM;
    byAGRSecteur[row.AGR][row.SECTEUR].volFact += row.VOL_FACT;
    byAGRSecteur[row.AGR][row.SECTEUR].redevTot += row.REDEV_TOT;
    byAGRSecteur[row.AGR][row.SECTEUR].count += 1;
    if (!clientsPerAGRSecteur[row.AGR]) clientsPerAGRSecteur[row.AGR] = {};
    if (!clientsPerAGRSecteur[row.AGR][row.SECTEUR]) clientsPerAGRSecteur[row.AGR][row.SECTEUR] = new Set();
    if (rowClientId !== '0' && rowClientId !== 'NaN') clientsPerAGRSecteur[row.AGR][row.SECTEUR].add(rowClientId);

    // Cross: AGR x Culture
    if (!byAGRCult[row.AGR]) byAGRCult[row.AGR] = {};
    if (!byAGRCult[row.AGR][row.CULT]) byAGRCult[row.AGR][row.CULT] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0, clientCount: 0 };
    byAGRCult[row.AGR][row.CULT].volConsom += row.VOL_CONSOM;
    byAGRCult[row.AGR][row.CULT].volFact += row.VOL_FACT;
    byAGRCult[row.AGR][row.CULT].redevTot += row.REDEV_TOT;
    byAGRCult[row.AGR][row.CULT].count += 1;
    if (!clientsPerAGRCult[row.AGR]) clientsPerAGRCult[row.AGR] = {};
    if (!clientsPerAGRCult[row.AGR][row.CULT]) clientsPerAGRCult[row.AGR][row.CULT] = new Set();
    if (rowClientId !== '0' && rowClientId !== 'NaN') clientsPerAGRCult[row.AGR][row.CULT].add(rowClientId);

    // Cross: Secteur x Culture
    if (!bySecteurCult[row.SECTEUR]) bySecteurCult[row.SECTEUR] = {};
    if (!bySecteurCult[row.SECTEUR][row.CULT]) bySecteurCult[row.SECTEUR][row.CULT] = { volConsom: 0, volFact: 0, redevTot: 0, count: 0, clientCount: 0 };
    bySecteurCult[row.SECTEUR][row.CULT].volConsom += row.VOL_CONSOM;
    bySecteurCult[row.SECTEUR][row.CULT].volFact += row.VOL_FACT;
    bySecteurCult[row.SECTEUR][row.CULT].redevTot += row.REDEV_TOT;
    bySecteurCult[row.SECTEUR][row.CULT].count += 1;
    if (!clientsPerSecteurCult[row.SECTEUR]) clientsPerSecteurCult[row.SECTEUR] = {};
    if (!clientsPerSecteurCult[row.SECTEUR][row.CULT]) clientsPerSecteurCult[row.SECTEUR][row.CULT] = new Set();
    if (rowClientId !== '0' && rowClientId !== 'NaN') clientsPerSecteurCult[row.SECTEUR][row.CULT].add(rowClientId);
  }

  // Convert client Sets to counts
  for (const key of Object.keys(byAGR)) byAGR[key].clientCount = clientsPerAGR[key]?.size || 0;
  for (const key of Object.keys(byCult)) byCult[key].clientCount = clientsPerCult[key]?.size || 0;
  for (const key of Object.keys(bySecteur)) bySecteur[key].clientCount = clientsPerSecteur[key]?.size || 0;
  for (const key of Object.keys(bySource)) bySource[key].clientCount = clientsPerSource[key]?.size || 0;
  for (const key of Object.keys(bySemestre)) bySemestre[key].clientCount = clientsPerSemestre[key]?.size || 0;
  for (const key of Object.keys(byCDA)) byCDA[key].clientCount = clientsPerCDA[key]?.size || 0;
  // Cross-analysis client counts
  for (const agr of Object.keys(byAGRSecteur)) {
    for (const secteur of Object.keys(byAGRSecteur[agr])) {
      byAGRSecteur[agr][secteur].clientCount = clientsPerAGRSecteur[agr]?.[secteur]?.size || 0;
    }
  }
  for (const agr of Object.keys(byAGRCult)) {
    for (const cult of Object.keys(byAGRCult[agr])) {
      byAGRCult[agr][cult].clientCount = clientsPerAGRCult[agr]?.[cult]?.size || 0;
    }
  }
  for (const secteur of Object.keys(bySecteurCult)) {
    for (const cult of Object.keys(bySecteurCult[secteur])) {
      bySecteurCult[secteur][cult].clientCount = clientsPerSecteurCult[secteur]?.[cult]?.size || 0;
    }
  }

  summary.totalClientCount = allClients.size;

  return { summary, byAGR, byCult, bySecteur, bySource, bySemestre, byClient, byCDA, byAGRSecteur, byAGRCult, bySecteurCult };
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
    if (secteur) {
      const secteurs = secteur.split(',');
      filtered = filtered.filter((r: any) => secteurs.includes(r.SECTEUR));
    }
    if (source) filtered = filtered.filter((r: any) => r.SOURCE === source);
    if (cult) {
      const cults = cult.split(',');
      filtered = filtered.filter((r: any) => cults.includes(r.CULT));
    }
    if (campagne) filtered = filtered.filter((r: any) => r.CAMPAGNE === campagne);
    if (semestre) filtered = filtered.filter((r: any) => r.SEMESTRE === semestre);

    // Compute aggregations from filtered data
    const agg = computeAggregations(filtered);

    // Count total unique clients (excluding invalid IDs)
    const allClientEntries = Object.entries(agg.byClient)
      .filter(([k]) => k !== '0' && k !== 'NaN');
    const totalClientCount = allClientEntries.length;
    const totalClientRedevTot = allClientEntries.reduce((s, [, v]: [string, any]) => s + (v as any).redevTot, 0);

    // Keep top 50 clients for charts (reduce payload)
    const byClientTop: Record<string, any> = {};
    const sortedClients = allClientEntries
      .sort(([,a]: [string, any],[,b]: [string, any]) => (b as any).redevTot - (a as any).redevTot);
    for (const [key, val] of sortedClients.slice(0, 50)) {
      byClientTop[key] = val;
    }

    // Top 10 clients for concentration metric
    const top10ClientRedev = sortedClients.slice(0, 10).reduce((s, [, v]: [string, any]) => s + (v as any).redevTot, 0);

    // NO rows in response - only aggregations (keeps payload small for Vercel)
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
      byAGRSecteur: agg.byAGRSecteur,
      byAGRCult: agg.byAGRCult,
      bySecteurCult: agg.bySecteurCult,
      clientStats: {
        totalClientCount,
        totalClientRedevTot,
        top10ClientRedev,
        concentrationPct: ((top10ClientRedev / (agg.summary.totalRedevTot || 1)) * 100).toFixed(1),
      },
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
