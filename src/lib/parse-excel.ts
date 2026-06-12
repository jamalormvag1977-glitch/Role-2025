import * as XLSX from 'xlsx';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export interface RowData {
  AGR: string;
  SECTEUR: string;
  SOURCE: string;
  CDA: number;
  CLIENT: number;
  CULT: string;
  CAMPAGNE: string;
  VOL_CONSOM: number;
  VOL_FACT: number;
  VOL_VOLEAU: number;
  COEF_MINO: number;
  TAUX_EQUI: number;
  TAXE_POMP: number;
  REDEV_CULT: number;
  REDEV_DPH: number;
  REDEV_TOT: number;
  SEMESTRE: string;
}

export interface DashboardData {
  rows: RowData[];
  filters: {
    agr: string[];
    secteur: string[];
    source: string[];
    cult: string[];
    campagne: string[];
    semestre: string[];
  };
  summary: {
    totalRows: number;
    totalVolConsom: number;
    totalVolFact: number;
    totalVolVoleau: number;
    totalRedevCult: number;
    totalRedevDph: number;
    totalRedevTot: number;
  };
  byAGR: Record<string, { volConsom: number; volFact: number; redevTot: number; redevCult: number; redevDph: number; count: number }>;
  byCult: Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>;
  bySecteur: Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>;
  bySource: Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>;
  bySemestre: Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>;
  byAGRSemestre: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number }>>;
  byCultAGR: Record<string, Record<string, { volConsom: number; redevTot: number }>>;
  bySecteurAGR: Record<string, Record<string, { volConsom: number; redevTot: number }>>;
  byClient: Record<string, { volConsom: number; volFact: number; redevTot: number; redevCult: number; redevDph: number; count: number; agr: string; secteur: string; cult: string }>;
  byCDA: Record<string, { volConsom: number; volFact: number; redevTot: number; redevCult: number; redevDph: number; count: number }>;
}

const UPLOAD_DIR = '/home/z/my-project/upload';
const BLOB_KEY = 'dashboard/data.xlsx';

async function fetchFromBlob(): Promise<Buffer | null> {
  try {
    const { head } = await import('@vercel/blob');
    const blobInfo = await head(BLOB_KEY);
    if (!blobInfo) return null;

    const response = await fetch(blobInfo.url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function findLocalExcelFile(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  try {
    const files = fs.readdirSync(UPLOAD_DIR) as string[];
    const simpleMatch = files.find(f => f === 'data.xlsx');
    if (simpleMatch) return path.join(UPLOAD_DIR, simpleMatch);
    const match = files.find((f: string) => f.endsWith('.xlsx'));
    return match ? path.join(UPLOAD_DIR, match) : null;
  } catch {
    return null;
  }
}

function parseBuffer(buffer: Buffer): DashboardData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames.find(s => s.includes('EXERCICE')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: 0 });

  const rows: RowData[] = rawRows.map(r => ({
    AGR: String(r['AGR'] || ''),
    SECTEUR: String(r['SECTEUR'] || ''),
    SOURCE: String(r['SOURCE'] || ''),
    CDA: Number(r['CDA'] || 0),
    CLIENT: Number(r['CLIENT'] || 0),
    CULT: String(r['CULT'] || ''),
    CAMPAGNE: String(r['CAMPAGNE'] || ''),
    VOL_CONSOM: Number(r['VOL_CONSOM'] || 0),
    VOL_FACT: Number(r['VOL_FACT'] || 0),
    VOL_VOLEAU: Number(r['VOL_VOLEAU'] || 0),
    COEF_MINO: Number(r['COEF_MINO'] || 0),
    TAUX_EQUI: Number(r['TAUX_EQUI'] || 0),
    TAXE_POMP: Number(r['TAXE_POMP'] || 0),
    REDEV_CULT: Number(r['REDEV_CULT'] || 0),
    REDEV_DPH: Number(r['REDEV_DPH'] || 0),
    REDEV_TOT: Number(r['REDEV-TOT'] || r['REDEV_TOT'] || 0),
    SEMESTRE: String(r['SEMESTRE'] || ''),
  }));

  // Build filters
  const agrSet = new Set<string>();
  const secteurSet = new Set<string>();
  const sourceSet = new Set<string>();
  const cultSet = new Set<string>();
  const campagneSet = new Set<string>();
  const semestreSet = new Set<string>();

  let totalVolConsom = 0, totalVolFact = 0, totalVolVoleau = 0;
  let totalRedevCult = 0, totalRedevDph = 0, totalRedevTot = 0;

  const byAGR: DashboardData['byAGR'] = {};
  const byCult: DashboardData['byCult'] = {};
  const bySecteur: DashboardData['bySecteur'] = {};
  const bySource: DashboardData['bySource'] = {};
  const bySemestre: DashboardData['bySemestre'] = {};
  const byAGRSemestre: DashboardData['byAGRSemestre'] = {};
  const byCultAGR: DashboardData['byCultAGR'] = {};
  const bySecteurAGR: DashboardData['bySecteurAGR'] = {};
  const byClient: DashboardData['byClient'] = {};
  const byCDA: DashboardData['byCDA'] = {};

  for (const row of rows) {
    if (row.AGR) agrSet.add(row.AGR);
    if (row.SECTEUR) secteurSet.add(row.SECTEUR);
    if (row.SOURCE) sourceSet.add(row.SOURCE);
    if (row.CULT) cultSet.add(row.CULT);
    if (row.CAMPAGNE) campagneSet.add(row.CAMPAGNE);
    if (row.SEMESTRE) semestreSet.add(row.SEMESTRE);

    totalVolConsom += row.VOL_CONSOM;
    totalVolFact += row.VOL_FACT;
    totalVolVoleau += row.VOL_VOLEAU;
    totalRedevCult += row.REDEV_CULT;
    totalRedevDph += row.REDEV_DPH;
    totalRedevTot += row.REDEV_TOT;

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

    if (!byAGRSemestre[row.AGR]) byAGRSemestre[row.AGR] = {};
    if (!byAGRSemestre[row.AGR][row.SEMESTRE]) byAGRSemestre[row.AGR][row.SEMESTRE] = { volConsom: 0, volFact: 0, redevTot: 0 };
    byAGRSemestre[row.AGR][row.SEMESTRE].volConsom += row.VOL_CONSOM;
    byAGRSemestre[row.AGR][row.SEMESTRE].volFact += row.VOL_FACT;
    byAGRSemestre[row.AGR][row.SEMESTRE].redevTot += row.REDEV_TOT;

    if (!byCultAGR[row.CULT]) byCultAGR[row.CULT] = {};
    if (!byCultAGR[row.CULT][row.AGR]) byCultAGR[row.CULT][row.AGR] = { volConsom: 0, redevTot: 0 };
    byCultAGR[row.CULT][row.AGR].volConsom += row.VOL_CONSOM;
    byCultAGR[row.CULT][row.AGR].redevTot += row.REDEV_TOT;

    if (!bySecteurAGR[row.SECTEUR]) bySecteurAGR[row.SECTEUR] = {};
    if (!bySecteurAGR[row.SECTEUR][row.AGR]) bySecteurAGR[row.SECTEUR][row.AGR] = { volConsom: 0, redevTot: 0 };
    bySecteurAGR[row.SECTEUR][row.AGR].volConsom += row.VOL_CONSOM;
    bySecteurAGR[row.SECTEUR][row.AGR].redevTot += row.REDEV_TOT;

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

  return {
    rows,
    filters: {
      agr: Array.from(agrSet).sort(),
      secteur: Array.from(secteurSet).sort(),
      source: Array.from(sourceSet).sort(),
      cult: Array.from(cultSet).sort(),
      campagne: Array.from(campagneSet).sort(),
      semestre: Array.from(semestreSet).sort(),
    },
    summary: { totalRows: rows.length, totalVolConsom, totalVolFact, totalVolVoleau, totalRedevCult, totalRedevDph, totalRedevTot },
    byAGR, byCult, bySecteur, bySource, bySemestre, byAGRSemestre, byCultAGR, bySecteurAGR, byClient, byCDA,
  };
}

// Main entry: tries Vercel Blob first, then local filesystem
export async function parseExcel(): Promise<DashboardData> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  // Try Vercel Blob (production)
  if (blobToken) {
    const buffer = await fetchFromBlob();
    if (buffer) {
      return parseBuffer(buffer);
    }
  }

  // Try local filesystem (development / fallback)
  const filePath = findLocalExcelFile();
  if (filePath) {
    const buffer = readFileSync(filePath);
    return parseBuffer(buffer);
  }

  throw new Error('Aucun fichier Excel trouvé. Veuillez charger un fichier via le bouton "Charger Excel".');
}

// Sync version for backward compatibility (local only)
export function parseExcelSync(): DashboardData {
  const filePath = findLocalExcelFile();
  if (!filePath) {
    throw new Error('Aucun fichier Excel trouvé dans le répertoire upload');
  }
  const buffer = readFileSync(filePath);
  return parseBuffer(buffer);
}
