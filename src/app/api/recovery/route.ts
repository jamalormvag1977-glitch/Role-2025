import { NextResponse } from 'next/server';
import { parseExcel, parseExcelSync } from '@/lib/parse-excel';
import { isCacheInvalidated, markCacheFresh } from '@/lib/cache';
import * as XLSX from 'xlsx';
import path from 'path';

// CDA -> AGR mapping
const CDA_TO_AGR: Record<string, string> = {
  '211': 'BEHT', '212': 'BEHT', '213': 'BEHT', '214': 'BEHT', '215': 'BEHT',
  '216': 'BEHT', '217': 'BEHT', '221': 'BEHT', '246': 'BEHT',
  '222': 'PTI', '223': 'PTI', '224': 'PTI', '226': 'PTI',
  '241': 'PTI', '242': 'PTI', '243': 'PTI', '244': 'PTI', '245': 'PTI',
  '225': 'STI', '231': 'STI', '233': 'STI', '234': 'STI', '235': 'STI',
  '236': 'STI', '943': 'STI',
  '237': 'SOUK EL ARBAA',
};

function parseDettesEncours() {
  const filePath = path.join(process.cwd(), 'upload', 'dettes 2025 ENCOURS.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

  // Aggregate by CDA and by AGR
  const dettesByCDA: Record<string, { cult: number; dph: number; clients: Set<string> }> = {};
  const dettesByAGR: Record<string, { cult: number; dph: number; clients: Set<string> }> = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = String(row[0] || '');
    const operation = String(row[3] || '');
    const solde = parseFloat(row[4]) || 0;

    if (!code || solde === 0) continue;

    const cda = code.substring(0, 3);
    const agr = CDA_TO_AGR[cda] || 'AUTRE';

    if (!dettesByCDA[cda]) dettesByCDA[cda] = { cult: 0, dph: 0, clients: new Set() };
    if (!dettesByAGR[agr]) dettesByAGR[agr] = { cult: 0, dph: 0, clients: new Set() };

    if (operation.includes('DPH')) {
      dettesByCDA[cda].dph += solde;
      dettesByAGR[agr].dph += solde;
    } else {
      dettesByCDA[cda].cult += solde;
      dettesByAGR[agr].cult += solde;
    }
    dettesByCDA[cda].clients.add(code);
    dettesByAGR[agr].clients.add(code);
  }

  // Convert Sets to counts
  const byCDA: Record<string, any> = {};
  for (const [cda, v] of Object.entries(dettesByCDA)) {
    byCDA[cda] = { cult: v.cult, dph: v.dph, total: v.cult + v.dph, clientCount: v.clients.size, agr: CDA_TO_AGR[cda] || 'AUTRE' };
  }

  const byAGR: Record<string, any> = {};
  for (const [agr, v] of Object.entries(dettesByAGR)) {
    byAGR[agr] = { cult: v.cult, dph: v.dph, total: v.cult + v.dph, clientCount: v.clients.size };
  }

  const totalCult = Object.values(byAGR).reduce((s: number, v: any) => s + v.cult, 0);
  const totalDph = Object.values(byAGR).reduce((s: number, v: any) => s + v.dph, 0);
  const totalAll = totalCult + totalDph;

  return { byCDA, byAGR, totalCult, totalDph, totalAll };
}

let cachedRecovery: any = null;

export async function GET() {
  try {
    if (!cachedRecovery || isCacheInvalidated()) {
      // Get main dashboard data (global debts)
      let mainData;
      try {
        mainData = await parseExcel();
      } catch {
        mainData = parseExcelSync();
      }

      // Aggregate redevances by AGR from main data
      const redevByAGR: Record<string, { cult: number; dph: number; total: number; count: number; clientCount: number }> = {};
      const clientsPerAGRMain: Record<string, Set<string>> = {};

      for (const row of mainData.rows) {
        const agr = row.AGR;
        if (!redevByAGR[agr]) {
          redevByAGR[agr] = { cult: 0, dph: 0, total: 0, count: 0, clientCount: 0 };
          clientsPerAGRMain[agr] = new Set();
        }
        redevByAGR[agr].cult += row.REDEV_CULT;
        redevByAGR[agr].dph += row.REDEV_DPH;
        redevByAGR[agr].total += row.REDEV_TOT;
        redevByAGR[agr].count += 1;
        const cid = String(row.CLIENT);
        if (cid !== '0' && cid !== 'NaN') clientsPerAGRMain[agr].add(cid);
      }
      for (const agr of Object.keys(redevByAGR)) {
        redevByAGR[agr].clientCount = clientsPerAGRMain[agr]?.size || 0;
      }

      // Parse dettes encours
      const dettes = parseDettesEncours();

      // Compute recovery = global - remaining
      const recoveryByAGR: Record<string, any> = {};
      for (const [agr, redev] of Object.entries(redevByAGR)) {
        const rest = dettes.byAGR[agr] || { cult: 0, dph: 0, total: 0, clientCount: 0 };
        const recovCult = redev.cult - rest.cult;
        const recovDph = redev.dph - rest.dph;
        const recovTotal = redev.total - rest.total;
        recoveryByAGR[agr] = {
          globalCult: redev.cult,
          globalDph: redev.dph,
          globalTotal: redev.total,
          globalCount: redev.count,
          globalClientCount: redev.clientCount,
          restCult: rest.cult,
          restDph: rest.dph,
          restTotal: rest.total,
          restClientCount: rest.clientCount || 0,
          recovCult,
          recovDph,
          recovTotal,
          tauxCult: redev.cult > 0 ? (recovCult / redev.cult * 100) : 0,
          tauxDph: redev.dph > 0 ? (recovDph / redev.dph * 100) : 0,
          tauxTotal: redev.total > 0 ? (recovTotal / redev.total * 100) : 0,
        };
      }

      // Recovery by CDA
      const redevByCDA: Record<string, { cult: number; dph: number; total: number; count: number; clientCount: number }> = {};
      const clientsPerCDAMain: Record<string, Set<string>> = {};
      for (const row of mainData.rows) {
        const cda = String(row.CDA);
        if (cda === '0' || cda === 'NaN' || !cda) continue;
        if (!redevByCDA[cda]) {
          redevByCDA[cda] = { cult: 0, dph: 0, total: 0, count: 0, clientCount: 0 };
          clientsPerCDAMain[cda] = new Set();
        }
        redevByCDA[cda].cult += row.REDEV_CULT;
        redevByCDA[cda].dph += row.REDEV_DPH;
        redevByCDA[cda].total += row.REDEV_TOT;
        redevByCDA[cda].count += 1;
        const cid = String(row.CLIENT);
        if (cid !== '0' && cid !== 'NaN') clientsPerCDAMain[cda].add(cid);
      }
      for (const cda of Object.keys(redevByCDA)) {
        redevByCDA[cda].clientCount = clientsPerCDAMain[cda]?.size || 0;
      }

      const recoveryByCDA: Record<string, any> = {};
      for (const [cda, redev] of Object.entries(redevByCDA)) {
        const rest = dettes.byCDA[cda] || { cult: 0, dph: 0, total: 0, clientCount: 0 };
        const recovCult = redev.cult - rest.cult;
        const recovDph = redev.dph - rest.dph;
        const recovTotal = redev.total - rest.total;
        recoveryByCDA[cda] = {
          agr: dettes.byCDA[cda]?.agr || CDA_TO_AGR[cda] || 'AUTRE',
          globalCult: redev.cult,
          globalDph: redev.dph,
          globalTotal: redev.total,
          globalCount: redev.count,
          globalClientCount: redev.clientCount,
          restCult: rest.cult,
          restDph: rest.dph,
          restTotal: rest.total,
          restClientCount: rest.clientCount || 0,
          recovCult,
          recovDph,
          recovTotal,
          tauxCult: redev.cult > 0 ? (recovCult / redev.cult * 100) : 0,
          tauxDph: redev.dph > 0 ? (recovDph / redev.dph * 100) : 0,
          tauxTotal: redev.total > 0 ? (recovTotal / redev.total * 100) : 0,
        };
      }

      // Totals
      const totalGlobalCult = Object.values(redevByAGR).reduce((s: number, v: any) => s + v.cult, 0);
      const totalGlobalDph = Object.values(redevByAGR).reduce((s: number, v: any) => s + v.dph, 0);
      const totalGlobalTotal = Object.values(redevByAGR).reduce((s: number, v: any) => s + v.total, 0);

      cachedRecovery = {
        byAGR: recoveryByAGR,
        byCDA: recoveryByCDA,
        totals: {
          globalCult: totalGlobalCult,
          globalDph: totalGlobalDph,
          globalTotal: totalGlobalTotal,
          restCult: dettes.totalCult,
          restDph: dettes.totalDph,
          restTotal: dettes.totalAll,
          recovCult: totalGlobalCult - dettes.totalCult,
          recovDph: totalGlobalDph - dettes.totalDph,
          recovTotal: totalGlobalTotal - dettes.totalAll,
          tauxCult: totalGlobalCult > 0 ? ((totalGlobalCult - dettes.totalCult) / totalGlobalCult * 100) : 0,
          tauxDph: totalGlobalDph > 0 ? ((totalGlobalDph - dettes.totalDph) / totalGlobalDph * 100) : 0,
          tauxTotal: totalGlobalTotal > 0 ? ((totalGlobalTotal - dettes.totalAll) / totalGlobalTotal * 100) : 0,
        },
        dateRef: '11 Juin 2026',
      };
      markCacheFresh();
    }

    return NextResponse.json(cachedRecovery);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
