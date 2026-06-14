'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  LayoutDashboard, BarChart3, Sprout, MapPin, Droplets, DollarSign,
  Upload, RefreshCw, ChevronDown, Filter, FileSpreadsheet,
  TrendingUp, Users, Zap, Menu, Building2, UserCheck, GitMerge
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Types
interface DashboardData {
  rows: any[];
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
  byAGR: Record<string, any>;
  byCult: Record<string, any>;
  bySecteur: Record<string, any>;
  bySource: Record<string, any>;
  bySemestre: Record<string, any>;
  byAGRSemestre: Record<string, Record<string, any>>;
  byCultAGR: Record<string, Record<string, any>>;
  bySecteurAGR: Record<string, Record<string, any>>;
  byClient: Record<string, any>;
  byCDA: Record<string, any>;
}

const CHART_COLORS = ['#1e40af', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
};

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M DH';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K DH';
  return n.toFixed(2) + ' DH';
};

const formatFullNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const NAV_ITEMS = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'agr', label: 'Analyse par AGR', icon: BarChart3 },
  { id: 'culture', label: 'Analyse par Culture', icon: Sprout },
  { id: 'secteur', label: 'Analyse par Secteur', icon: MapPin },
  { id: 'source', label: 'Analyse par Source', icon: Droplets },
  { id: 'finance', label: 'Analyse Financière', icon: DollarSign },
  { id: 'cross', label: 'Analyse Croisée', icon: GitMerge },
  { id: 'client', label: 'Analyse par Client', icon: UserCheck },
  { id: 'cda', label: 'Analyse par CDA', icon: Building2 },
];

interface FilterState {
  agr: string;
  secteur: string;
  source: string;
  cult: string;
  campagne: string;
  semestre: string;
}

interface FilteredData {
  summary: { totalRows: number; totalVolConsom: number; totalVolFact: number; totalVolVoleau: number; totalRedevCult: number; totalRedevDph: number; totalRedevTot: number };
  byAGR: Record<string, any>;
  byCult: Record<string, any>;
  bySecteur: Record<string, any>;
  bySource: Record<string, any>;
  bySemestre: Record<string, any>;
  byClient: Record<string, any>;
  byCDA: Record<string, any>;
  byAGRSecteur: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>>;
  byAGRCult: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>>;
  bySecteurCult: Record<string, Record<string, { volConsom: number; volFact: number; redevTot: number; count: number }>>;
  clientStats?: { totalClientCount: number; totalClientRedevTot: number; top10ClientRedev: number; concentrationPct: string };
}

// Filtering is now done server-side via /api/data?agr=...&secteur=...
// No need for client-side computeFiltered anymore

// --- Extracted Components (outside render) ---

function SidebarComponent({
  sidebarOpen,
  setSidebarOpen,
  activeSection,
  setActiveSection,
  uploading,
  uploadMessage,
  onUploadClick,
  fd,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  activeSection: string;
  setActiveSection: (v: string) => void;
  uploading: boolean;
  uploadMessage: string;
  onUploadClick: () => void;
  fd: FilteredData | null;
}) {
  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gradient-to-b from-[#0f2744] to-[#1e3a5f] text-white flex flex-col transition-all duration-300 flex-shrink-0 relative`}>
      <div className="p-4 flex items-center gap-3 border-b border-blue-700/30">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="h-5 w-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold leading-tight whitespace-nowrap">Rôle Exercice</h1>
            <p className="text-xs text-blue-300 whitespace-nowrap">Dashboard 2025</p>
          </div>
        )}
      </div>

      <div className="p-3">
        <button
          onClick={onUploadClick}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 shadow-lg shadow-emerald-600/20"
        >
          {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {sidebarOpen && <span>{uploading ? 'Chargement...' : 'Charger Excel'}</span>}
        </button>
        {uploadMessage && sidebarOpen && (
          <p className={`text-xs mt-2 ${uploadMessage.includes('succès') ? 'text-green-400' : 'text-red-400'}`}>
            {uploadMessage}
          </p>
        )}
      </div>

      <Separator className="bg-blue-700/30 mx-3" />

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-blue-200 hover:bg-blue-800/50 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors z-10"
      >
        {sidebarOpen ? <ChevronDown className="h-3 w-3 rotate-90" /> : <ChevronDown className="h-3 w-3 -rotate-90" />}
      </button>

      {sidebarOpen && fd && (
        <div className="p-4 border-t border-blue-700/30">
          <div className="text-xs text-blue-300">
            <p>Enregistrements: <span className="text-white font-semibold">{formatFullNumber(fd.summary.totalRows)}</span></p>
            <p>Dernière MAJ: <span className="text-white">{new Date().toLocaleDateString('fr-FR')}</span></p>
          </div>
        </div>
      )}
    </aside>
  );
}

function FilterBarComponent({ filters, data, updateFilter, resetFilters }: {
  filters: FilterState;
  data: DashboardData;
  updateFilter: (key: string, value: string) => void;
  resetFilters: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
        <Filter className="h-4 w-4" />
        <span>Filtres:</span>
      </div>
      <Select value={filters.agr} onValueChange={v => updateFilter('agr', v)}>
        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="AGR" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous AGR</SelectItem>
          {data.filters.agr.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.secteur} onValueChange={v => updateFilter('secteur', v)}>
        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Secteur" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous Secteurs</SelectItem>
          {data.filters.secteur.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.source} onValueChange={v => updateFilter('source', v)}>
        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes Sources</SelectItem>
          {data.filters.source.map(s => <SelectItem key={s} value={s}>{s === 'R' ? 'Surface (R)' : s === 'PP' ? 'Pompage (PP)' : s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.cult} onValueChange={v => updateFilter('cult', v)}>
        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Culture" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes Cultures</SelectItem>
          {data.filters.cult.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.semestre} onValueChange={v => updateFilter('semestre', v)}>
        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Semestre" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {data.filters.semestre.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.campagne} onValueChange={v => updateFilter('campagne', v)}>
        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Campagne" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes Campagnes</SelectItem>
          {data.filters.campagne.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={resetFilters}>
        Réinitialiser
      </Button>
    </div>
  );
}

function OverviewSection({ fd }: { fd: FilteredData }) {
  const agrChartData = Object.entries(fd.byAGR).map(([name, v]: [string, any]) => ({
    name, volConsom: v.volConsom, volFact: v.volFact, redevTot: v.redevTot,
  }));
  const semestreChartData = Object.entries(fd.bySemestre).map(([name, v]: [string, any]) => ({
    name, volConsom: v.volConsom, volFact: v.volFact, redevTot: v.redevTot,
  }));
  const topCulturesByRevenue = Object.entries(fd.byCult)
    .map(([name, v]: [string, any]) => ({ name, value: v.redevTot }))
    .sort((a, b) => b.value - a.value).slice(0, 8);
  const agrRadarData = Object.entries(fd.byAGR).map(([name, v]: [string, any]) => ({
    name, volume: Math.round(v.volConsom / 1_000_000), redevable: Math.round(v.redevTot / 1_000_000), clients: Math.round(v.count / 100),
  }));

  // Table data: aggregated by AGR
  const overviewTableData = Object.entries(fd.byAGR)
    .map(([name, v]: [string, any]) => ({ name, ...v }))
    .sort((a, b) => b.redevTot - a.redevTot);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Consommé</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(fd.summary.totalVolConsom)}</p>
                <p className="text-xs text-gray-400 mt-1">m³ total</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Droplets className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Facturé</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(fd.summary.totalVolFact)}</p>
                <p className="text-xs text-gray-400 mt-1">m³ total</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Redevance Totale</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(fd.summary.totalRedevTot)}</p>
                <p className="text-xs text-gray-400 mt-1">Dirhams</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de Clients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatFullNumber(fd.summary.totalRows)}</p>
                <p className="text-xs text-gray-400 mt-1">enregistrements</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Volumes par AGR</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agrChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                <Tooltip formatter={(v: number) => formatFullNumber(v)} />
                <Legend />
                <Bar dataKey="volConsom" name="Volume Consommé" fill="#1e40af" radius={[4,4,0,0]} />
                <Bar dataKey="volFact" name="Volume Facturé" fill="#60a5fa" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Redevances par Semestre</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={semestreChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="redevTot" name="Redevance Totale" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Répartition par Culture (Top 8)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={topCulturesByRevenue} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#666', strokeWidth: 1 }}>
                  {topCulturesByRevenue.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Radar Comparatif AGR</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={agrRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar name="Volume (M m³)" dataKey="volume" stroke="#1e40af" fill="#1e40af" fillOpacity={0.2} />
                <Radar name="Redevable (M DH)" dataKey="redevable" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé Vue d'ensemble */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Récapitulatif par AGR</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">AGR</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Nb Enregistrements</TableHead>
                  <TableHead className="text-right font-semibold">Vol. Consommé (m³)</TableHead>
                  <TableHead className="text-right font-semibold">Vol. Facturé (m³)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                  <TableHead className="text-right font-semibold">% Vol. Cons.</TableHead>
                  <TableHead className="text-right font-semibold">% Vol. Fact.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overviewTableData.map((row: any) => {
                  const cultPct = ((row.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                  const dphPct = ((row.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                  const totPct = ((row.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                  const volConsPct = ((row.volConsom / (fd.summary.totalVolConsom || 1)) * 100).toFixed(1);
                  const volFactPct = ((row.volFact / (fd.summary.totalVolFact || 1)) * 100).toFixed(1);
                  return (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(row.clientCount)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(row.count)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(row.volConsom)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(row.volFact)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(row.redevCult)}</TableCell>
                    <TableCell className="text-right">{cultPct}%</TableCell>
                    <TableCell className="text-right text-blue-700">{formatCurrency(row.redevDph)}</TableCell>
                    <TableCell className="text-right">{dphPct}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(row.redevTot)}</TableCell>
                    <TableCell className="text-right">{totPct}%</TableCell>
                    <TableCell className="text-right">{volConsPct}%</TableCell>
                    <TableCell className="text-right">{volFactPct}%</TableCell>
                  </TableRow>
                );})}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalVolConsom)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalVolFact)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AGRSection({ fd }: { fd: FilteredData }) {
  const agrChartData = Object.entries(fd.byAGR).map(([name, v]: [string, any]) => ({
    name, volConsom: v.volConsom, volFact: v.volFact, redevTot: v.redevTot,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(fd.byAGR).map(([name, v]: [string, any]) => (
          <Card key={name} className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{name}</p>
                  <Badge variant="secondary" className="text-xs">{v.count} enr.</Badge>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Vol. Consommé</span><span className="font-semibold">{formatNumber(v.volConsom)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Vol. Facturé</span><span className="font-semibold">{formatNumber(v.volFact)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Redev. Totale</span><span className="font-semibold text-emerald-600">{formatCurrency(v.redevTot)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Comparaison Volumes par AGR</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={agrChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(v: number) => formatFullNumber(v)} />
                <Legend />
                <Bar dataKey="volConsom" name="Vol. Consommé" fill="#1e40af" radius={[0,4,4,0]} />
                <Bar dataKey="volFact" name="Vol. Facturé" fill="#60a5fa" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Redevances par AGR</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={agrChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="redevTot" name="Redevance Totale" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé AGR */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Détail par AGR</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">AGR</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Nb Enregistrements</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(fd.byAGR)
                  .sort(([,a]: [string, any],[,b]: [string, any]) => b.redevTot - a.redevTot)
                  .map(([name, v]: [string, any]) => {
                    const cultPct = ((v.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                    const dphPct = ((v.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                    const totPct = ((v.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                    return (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(v.clientCount)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(v.count)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(v.redevCult)}</TableCell>
                    <TableCell className="text-right">{cultPct}%</TableCell>
                    <TableCell className="text-right text-blue-700">{formatCurrency(v.redevDph)}</TableCell>
                    <TableCell className="text-right">{dphPct}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(v.redevTot)}</TableCell>
                    <TableCell className="text-right">{totPct}%</TableCell>
                  </TableRow>
                );})}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function CultureSection({ fd }: { fd: FilteredData }) {
  const cultChartData = Object.entries(fd.byCult)
    .map(([name, v]: [string, any]) => ({ name, volConsom: v.volConsom, redevTot: v.redevTot, count: v.count }))
    .sort((a, b) => b.volConsom - a.volConsom).slice(0, 15);
  const topCulturesByRevenue = Object.entries(fd.byCult)
    .map(([name, v]: [string, any]) => ({ name, value: v.redevTot }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 15 Cultures par Volume Consommé</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={cultChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatFullNumber(v)} />
              <Legend />
              <Bar dataKey="volConsom" name="Volume Consommé" fill="#1e40af" radius={[4,4,0,0]} />
              <Bar dataKey="redevTot" name="Redevance Totale" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Répartition des Cultures par Redevance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={topCulturesByRevenue} cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {topCulturesByRevenue.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Détail par Culture</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {Object.entries(fd.byCult)
                  .sort(([,a]: [string, any],[,b]: [string, any]) => b.redevTot - a.redevTot)
                  .map(([name, v]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Sprout className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-gray-900">{formatCurrency(v.redevTot)}</p>
                      <p className="text-gray-400">{v.count} enr.</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé Culture */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Détail par Culture</CardTitle></CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Culture</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Nb Enregistrements</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(fd.byCult)
                  .sort(([,a]: [string, any],[,b]: [string, any]) => b.redevTot - a.redevTot)
                  .map(([name, v]: [string, any]) => {
                    const cultPct = ((v.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                    const dphPct = ((v.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                    const totPct = ((v.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                    return (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(v.clientCount)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(v.count)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(v.redevCult)}</TableCell>
                    <TableCell className="text-right">{cultPct}%</TableCell>
                    <TableCell className="text-right text-blue-700">{formatCurrency(v.redevDph)}</TableCell>
                    <TableCell className="text-right">{dphPct}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(v.redevTot)}</TableCell>
                    <TableCell className="text-right">{totPct}%</TableCell>
                  </TableRow>
                );})}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SecteurSection({ fd }: { fd: FilteredData }) {
  const secteurChartData = Object.entries(fd.bySecteur)
    .map(([name, v]: [string, any]) => ({ name, volConsom: v.volConsom, redevTot: v.redevTot, count: v.count }))
    .sort((a, b) => b.volConsom - a.volConsom).slice(0, 20);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 20 Secteurs par Volume</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={secteurChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={(v: number) => formatFullNumber(v)} />
              <Legend />
              <Bar dataKey="volConsom" name="Volume Consommé" fill="#1e40af" radius={[0,4,4,0]} />
              <Bar dataKey="redevTot" name="Redevance Totale" fill="#10b981" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Détail par Secteur</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(fd.bySecteur)
                .sort(([,a]: [string, any],[,b]: [string, any]) => b.volConsom - a.volConsom)
                .map(([name, v]: [string, any]) => (
                <div key={name} className="p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-bold">{name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{v.count}</Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Vol. Consommé</span><span className="font-medium">{formatNumber(v.volConsom)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Redev. Totale</span><span className="font-medium text-emerald-600">{formatCurrency(v.redevTot)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tableau détaillé Secteur */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Détail par Secteur</CardTitle></CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Secteur</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Nb Enregistrements</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(fd.bySecteur)
                  .sort(([,a]: [string, any],[,b]: [string, any]) => b.redevTot - a.redevTot)
                  .map(([name, v]: [string, any]) => {
                    const cultPct = ((v.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                    const dphPct = ((v.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                    const totPct = ((v.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                    return (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(v.clientCount)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(v.count)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(v.redevCult)}</TableCell>
                    <TableCell className="text-right">{cultPct}%</TableCell>
                    <TableCell className="text-right text-blue-700">{formatCurrency(v.redevDph)}</TableCell>
                    <TableCell className="text-right">{dphPct}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(v.redevTot)}</TableCell>
                    <TableCell className="text-right">{totPct}%</TableCell>
                  </TableRow>
                );})}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceSection({ fd }: { fd: FilteredData }) {
  const sourceChartData = Object.entries(fd.bySource).map(([name, v]: [string, any]) => ({
    name: name === 'R' ? 'Eau de surface (R)' : 'Pompage (PP)',
    volConsom: v.volConsom, volFact: v.volFact, redevTot: v.redevTot, count: v.count,
    isSurface: name === 'R',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sourceChartData.map((item) => (
          <Card key={item.name} className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 ${item.isSurface ? 'bg-blue-100' : 'bg-amber-100'} rounded-xl flex items-center justify-center`}>
                  {item.isSurface ? <Droplets className="h-7 w-7 text-blue-700" /> : <Zap className="h-7 w-7 text-amber-700" />}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.count} enregistrements</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Volume Consommé</span>
                  <span className="font-bold">{formatFullNumber(item.volConsom)} m³</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Volume Facturé</span>
                  <span className="font-bold">{formatFullNumber(item.volFact)} m³</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-lg">
                  <span className="text-gray-600">Redevance Totale</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(item.redevTot)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Comparaison Sources d&apos;Eau</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={sourceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatFullNumber(v)} />
              <Legend />
              <Bar dataKey="volConsom" name="Vol. Consommé" fill="#1e40af" radius={[4,4,0,0]} />
              <Bar dataKey="volFact" name="Vol. Facturé" fill="#60a5fa" radius={[4,4,0,0]} />
              <Bar dataKey="redevTot" name="Redevance" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau détaillé Source */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Détail par Source</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                <TableHead className="text-right font-semibold">Nb Enregistrements</TableHead>
                <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(fd.bySource)
                .sort(([,a]: [string, any],[,b]: [string, any]) => b.redevTot - a.redevTot)
                .map(([name, v]: [string, any]) => {
                  const cultPct = ((v.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                  const dphPct = ((v.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                  const totPct = ((v.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                  return (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name === 'R' ? 'Eau de surface (R)' : 'Pompage (PP)'}</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(v.clientCount)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(v.count)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(v.redevCult)}</TableCell>
                  <TableCell className="text-right">{cultPct}%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(v.redevDph)}</TableCell>
                  <TableCell className="text-right">{dphPct}%</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(v.redevTot)}</TableCell>
                  <TableCell className="text-right">{totPct}%</TableCell>
                </TableRow>
              );})}
              <TableRow className="bg-gray-50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
                <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
                <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceSection({ fd }: { fd: FilteredData }) {
  const financialByAGR = Object.entries(fd.byAGR).map(([name, v]: [string, any]) => ({
    name,
    redevCult: v.redevCult || v.redevTot * 0.9,
    redevDph: v.redevDph || v.redevTot * 0.1,
    redevTot: v.redevTot,
  }));
  const semestreChartData = Object.entries(fd.bySemestre).map(([name, v]: [string, any]) => ({
    name, volConsom: v.volConsom, volFact: v.volFact, redevTot: v.redevTot,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Redevance Culture</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(fd.summary.totalRedevCult)}</p>
            <p className="text-xs text-gray-400 mt-1">{((fd.summary.totalRedevCult / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1)}% du total</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Redevance DPH</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(fd.summary.totalRedevDph)}</p>
            <p className="text-xs text-gray-400 mt-1">{((fd.summary.totalRedevDph / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1)}% du total</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Redevance Totale</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(fd.summary.totalRedevTot)}</p>
            <p className="text-xs text-gray-400 mt-1">Total combiné</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Redevances par AGR (Cult vs DPH)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={financialByAGR}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="redevCult" name="Redev. Culture" stackId="a" fill="#10b981" />
                <Bar dataKey="redevDph" name="Redev. DPH" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Répartition Financière Globale</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Redev. Culture', value: fd.summary.totalRedevCult },
                    { name: 'Redev. DPH', value: fd.summary.totalRedevDph },
                  ]}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tendance des Redevances par Semestre</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={semestreChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="redevTot" name="Redevance Totale" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau détaillé Financier */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Détail Financier par AGR</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">AGR</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture (DH)</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH (DH)</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale (DH)</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(fd.byAGR)
                  .sort(([,a]: [string, any],[,b]: [string, any]) => b.redevTot - a.redevTot)
                  .map(([name, v]: [string, any]) => {
                    const cultPct = ((v.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                    const dphPct = ((v.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                    const totPct = ((v.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                    return (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(v.clientCount)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(v.redevCult)}</TableCell>
                      <TableCell className="text-right">{cultPct}%</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(v.redevDph)}</TableCell>
                      <TableCell className="text-right">{dphPct}%</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(v.redevTot)}</TableCell>
                      <TableCell className="text-right">{totPct}%</TableCell>
                    </TableRow>
                  );})}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function CrossAnalysisSection({ fd }: { fd: FilteredData }) {
  // AGR x Secteur cross-data
  const agrNames = Object.keys(fd.byAGR).sort();
  const secteurNames = Object.keys(fd.bySecteur).sort();
  const cultNames = Object.keys(fd.byCult).sort();

  // Flatten cross data for charts: top AGR x Secteur combinations
  const agrSecteurFlat = Object.entries(fd.byAGRSecteur || {})
    .flatMap(([agr, secteurs]: [string, any]) =>
      Object.entries(secteurs as Record<string, any>).map(([secteur, v]: [string, any]) => ({
        name: `${agr} / ${secteur}`,
        agr,
        secteur,
        volConsom: v.volConsom,
        redevTot: v.redevTot,
        count: v.count,
      }))
    )
    .sort((a, b) => b.redevTot - a.redevTot)
    .slice(0, 25);

  // Flatten AGR x Culture
  const agrCultFlat = Object.entries(fd.byAGRCult || {})
    .flatMap(([agr, cults]: [string, any]) =>
      Object.entries(cults as Record<string, any>).map(([cult, v]: [string, any]) => ({
        name: `${agr} / ${cult}`,
        agr,
        cult,
        volConsom: v.volConsom,
        redevTot: v.redevTot,
        count: v.count,
      }))
    )
    .sort((a, b) => b.redevTot - a.redevTot)
    .slice(0, 25);

  // Flatten Secteur x Culture
  const secteurCultFlat = Object.entries(fd.bySecteurCult || {})
    .flatMap(([secteur, cults]: [string, any]) =>
      Object.entries(cults as Record<string, any>).map(([cult, v]: [string, any]) => ({
        name: `${secteur} / ${cult}`,
        secteur,
        cult,
        volConsom: v.volConsom,
        redevTot: v.redevTot,
        count: v.count,
      }))
    )
    .sort((a, b) => b.redevTot - a.redevTot)
    .slice(0, 25);

  // Heat map data for AGR x Secteur (redevTot)
  const agrSecteurHeatData: { agr: string; secteur: string; value: number }[] = [];
  for (const agr of agrNames) {
    for (const secteur of secteurNames) {
      const val = fd.byAGRSecteur?.[agr]?.[secteur];
      if (val && val.redevTot > 0) {
        agrSecteurHeatData.push({ agr, secteur, value: val.redevTot });
      }
    }
  }

  // Heat map data for AGR x Culture (redevTot)
  const agrCultHeatData: { agr: string; cult: string; value: number }[] = [];
  for (const agr of agrNames) {
    for (const cult of cultNames) {
      const val = fd.byAGRCult?.[agr]?.[cult];
      if (val && val.redevTot > 0) {
        agrCultHeatData.push({ agr, cult, value: val.redevTot });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Combinaisons AGR × Secteur</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{agrSecteurHeatData.length}</p>
            <p className="text-xs text-gray-400 mt-1">paires actives sur {agrNames.length} AGR × {secteurNames.length} secteurs</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Combinaisons AGR × Culture</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{agrCultHeatData.length}</p>
            <p className="text-xs text-gray-400 mt-1">paires actives sur {agrNames.length} AGR × {cultNames.length} cultures</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Combinaisons Secteur × Culture</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{secteurCultFlat.length}</p>
            <p className="text-xs text-gray-400 mt-1">top combinaisons par redevance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Top 25 AGR x Secteur */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 25 Combinaisons AGR × Secteur par Redevance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={agrSecteurFlat} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="redevTot" name="Redev. Totale" fill="#1e40af" radius={[0,4,4,0]} />
              <Bar dataKey="volConsom" name="Vol. Consommé" fill="#60a5fa" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts: Top 25 AGR x Culture */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 25 Combinaisons AGR × Culture par Redevance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={agrCultFlat} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="redevTot" name="Redev. Totale" fill="#10b981" radius={[0,4,4,0]} />
              <Bar dataKey="volConsom" name="Vol. Consommé" fill="#6ee7b7" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts: Top 25 Secteur x Culture */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 25 Combinaisons Secteur × Culture par Redevance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={secteurCultFlat} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="redevTot" name="Redev. Totale" fill="#8b5cf6" radius={[0,4,4,0]} />
              <Bar dataKey="volConsom" name="Vol. Consommé" fill="#c4b5fd" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pivot Table: AGR x Secteur */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Croisé AGR × Secteur (Redevance Totale en DH)</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10">AGR \ Secteur</TableHead>
                  {secteurNames.map(s => (
                    <TableHead key={s} className="text-right font-semibold text-xs whitespace-nowrap">{s}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold bg-blue-50">Total AGR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agrNames.map(agr => {
                  const agrTotal = fd.byAGR[agr]?.redevTot || 0;
                  return (
                    <TableRow key={agr}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10">{agr}</TableCell>
                      {secteurNames.map(secteur => {
                        const val = fd.byAGRSecteur?.[agr]?.[secteur];
                        return (
                          <TableCell key={secteur} className="text-right text-xs">
                            {val ? formatCurrency(val.redevTot) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold bg-blue-50 text-xs">{formatCurrency(agrTotal)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell className="sticky left-0 bg-gray-100 z-10">Total Secteur</TableCell>
                  {secteurNames.map(s => (
                    <TableCell key={s} className="text-right text-xs">{formatCurrency(fd.bySecteur[s]?.redevTot || 0)}</TableCell>
                  ))}
                  <TableCell className="text-right bg-blue-50 text-xs">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pivot Table: AGR x Culture */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Croisé AGR × Culture (Redevance Totale en DH)</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10">AGR \ Culture</TableHead>
                  {cultNames.map(c => (
                    <TableHead key={c} className="text-right font-semibold text-xs whitespace-nowrap">{c}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold bg-emerald-50">Total AGR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agrNames.map(agr => {
                  const agrTotal = fd.byAGR[agr]?.redevTot || 0;
                  return (
                    <TableRow key={agr}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10">{agr}</TableCell>
                      {cultNames.map(cult => {
                        const val = fd.byAGRCult?.[agr]?.[cult];
                        return (
                          <TableCell key={cult} className="text-right text-xs">
                            {val ? formatCurrency(val.redevTot) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold bg-emerald-50 text-xs">{formatCurrency(agrTotal)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell className="sticky left-0 bg-gray-100 z-10">Total Culture</TableCell>
                  {cultNames.map(c => (
                    <TableCell key={c} className="text-right text-xs">{formatCurrency(fd.byCult[c]?.redevTot || 0)}</TableCell>
                  ))}
                  <TableCell className="text-right bg-emerald-50 text-xs">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pivot Table: Secteur x Culture */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Croisé Secteur × Culture (Redevance Totale en DH)</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10">Secteur \ Culture</TableHead>
                  {cultNames.map(c => (
                    <TableHead key={c} className="text-right font-semibold text-xs whitespace-nowrap">{c}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold bg-purple-50">Total Secteur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secteurNames.map(secteur => {
                  const secteurTotal = fd.bySecteur[secteur]?.redevTot || 0;
                  return (
                    <TableRow key={secteur}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10">{secteur}</TableCell>
                      {cultNames.map(cult => {
                        const val = fd.bySecteurCult?.[secteur]?.[cult];
                        return (
                          <TableCell key={cult} className="text-right text-xs">
                            {val ? formatCurrency(val.redevTot) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold bg-purple-50 text-xs">{formatCurrency(secteurTotal)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell className="sticky left-0 bg-gray-100 z-10">Total Culture</TableCell>
                  {cultNames.map(c => (
                    <TableCell key={c} className="text-right text-xs">{formatCurrency(fd.byCult[c]?.redevTot || 0)}</TableCell>
                  ))}
                  <TableCell className="text-right bg-purple-50 text-xs">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Flat detail table: All cross combinations */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Détail Complet - Top 50 Combinaisons AGR × Secteur × Culture</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">AGR</TableHead>
                  <TableHead className="font-semibold">Secteur</TableHead>
                  <TableHead className="font-semibold">Culture</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Nb Enr.</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale (DH)</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Build AGR x Secteur x Cult from the cross data */}
                {(() => {
                  const allCombos: any[] = [];
                  for (const [agr, secteurs] of Object.entries(fd.byAGRSecteur || {})) {
                    for (const [secteur, sv] of Object.entries(secteurs as Record<string, any>)) {
                      // Find matching cultures for this AGR+Secteur
                      const matchingCults: string[] = [];
                      for (const [cult, agrs] of Object.entries(fd.byAGRCult?.[agr] || {})) {
                        if (fd.bySecteurCult?.[secteur]?.[cult]) {
                          matchingCults.push(cult);
                        }
                      }
                      if (matchingCults.length > 0) {
                        for (const cult of matchingCults) {
                          const agrCultVal = fd.byAGRCult?.[agr]?.[cult];
                          const sectCultVal = fd.bySecteurCult?.[secteur]?.[cult];
                          if (agrCultVal && sectCultVal) {
                            // Approximate the 3-way intersection proportionally
                            const cultPctInAGR = agrCultVal.redevTot / (fd.byAGR[agr]?.redevTot || 1);
                            const sectCultPct = sectCultVal.redevTot / (fd.bySecteur[secteur]?.redevTot || 1);
                            const estRedevTot = sv.redevTot * cultPctInAGR * sectCultPct / (cultPctInAGR + sectCultPct || 1) * 2;
                            // Estimate client count proportionally
                            const agrSectClientCount = sv.clientCount || 0;
                            const estClientCount = Math.round(agrSectClientCount * cultPctInAGR);
                            // Estimate redevCult/redevDph proportionally from AGR data
                            const agrRedevCultPct = fd.byAGR[agr]?.redevCult / (fd.byAGR[agr]?.redevTot || 1) || 0;
                            const agrRedevDphPct = fd.byAGR[agr]?.redevDph / (fd.byAGR[agr]?.redevTot || 1) || 0;
                            allCombos.push({
                              agr, secteur, cult,
                              redevTot: estRedevTot,
                              redevCult: estRedevTot * agrRedevCultPct,
                              redevDph: estRedevTot * agrRedevDphPct,
                              volConsom: sv.volConsom * cultPctInAGR,
                              volFact: sv.volFact * cultPctInAGR,
                              count: Math.round(sv.count * cultPctInAGR),
                              clientCount: estClientCount,
                            });
                          }
                        }
                      } else {
                        allCombos.push({
                          agr, secteur, cult: '-',
                          redevTot: sv.redevTot,
                          redevCult: sv.redevCult || 0,
                          redevDph: sv.redevDph || 0,
                          volConsom: sv.volConsom,
                          volFact: sv.volFact,
                          count: sv.count,
                          clientCount: sv.clientCount || 0,
                        });
                      }
                    }
                  }
                  return allCombos
                    .sort((a, b) => b.redevTot - a.redevTot)
                    .slice(0, 50)
                    .map((row, i) => {
                      const cultPct = ((row.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                      const dphPct = ((row.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                      const totPct = ((row.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                      return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.agr}</TableCell>
                        <TableCell>{row.secteur}</TableCell>
                        <TableCell>{row.cult}</TableCell>
                        <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(row.clientCount)}</TableCell>
                        <TableCell className="text-right">{formatFullNumber(row.count)}</TableCell>
                        <TableCell className="text-right text-emerald-700">{formatCurrency(row.redevCult)}</TableCell>
                        <TableCell className="text-right">{cultPct}%</TableCell>
                        <TableCell className="text-right text-blue-700">{formatCurrency(row.redevDph)}</TableCell>
                        <TableCell className="text-right">{dphPct}%</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.redevTot)}</TableCell>
                        <TableCell className="text-right">{totPct}%</TableCell>
                      </TableRow>
                    );})
                })()}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientSection({ fd, clientStats, globalFilters }: { fd: FilteredData; clientStats: { totalClientCount: number; totalClientRedevTot: number; top10ClientRedev: number; concentrationPct: string }; globalFilters: FilterState }) {
  const clientEntries = Object.entries(fd.byClient)
    .map(([id, v]: [string, any]) => ({ id, ...v }))
    .filter(c => c.id !== '0' && c.id !== 'NaN' && c.count > 0)
    .sort((a, b) => b.redevTot - a.redevTot);

  const top20Clients = clientEntries.slice(0, 20);
  const top10ByRevenue = clientEntries.slice(0, 10);

  const totalClients = clientStats.totalClientCount;
  const concentrationPct = clientStats.concentrationPct;

  const [clientPage, setClientPage] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [clientData, setClientData] = useState<{clients: any[], total: number, totalPages: number}>({clients: [], total: 0, totalPages: 0});
  const [loadingClients, setLoadingClients] = useState(false);

  React.useEffect(() => {
    setClientPage(1); // Reset to page 1 when filters change
    setLoadingClients(true);
    const params = new URLSearchParams({ page: String(clientPage), limit: '100', search: clientSearch });
    // Pass global filters to the clients API
    if (globalFilters.agr !== 'all') params.set('agr', globalFilters.agr);
    if (globalFilters.secteur !== 'all') params.set('secteur', globalFilters.secteur);
    if (globalFilters.source !== 'all') params.set('source', globalFilters.source);
    if (globalFilters.cult !== 'all') params.set('cult', globalFilters.cult);
    fetch(`/api/clients?${params}`)
      .then(r => r.json())
      .then(d => { setClientData(d); setLoadingClients(false); })
      .catch(() => setLoadingClients(false));
  }, [clientPage, clientSearch, globalFilters]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md border-l-4 border-l-indigo-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Nombre de Clients</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{formatFullNumber(totalClients)}</p>
            <p className="text-xs text-gray-400 mt-1">clients uniques</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Redevance Totale</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(fd.summary.totalRedevTot)}</p>
            <p className="text-xs text-gray-400 mt-1">tous clients confondus</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Concentration Top 10</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{concentrationPct}%</p>
            <p className="text-xs text-gray-400 mt-1">de la redevance totale</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 20 Clients par Redevance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={top20Clients.map(c => ({ name: `C-${c.id}`, redevTot: c.redevTot, volConsom: c.volConsom }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="redevTot" name="Redev. Totale" fill="#6366f1" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 10 Clients - Répartition</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={top10ByRevenue.map(c => ({ name: `C-${c.id}`, value: c.redevTot }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {top10ByRevenue.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 20 Clients par Volume</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={clientEntries.slice(0, 20).sort((a, b) => b.volConsom - a.volConsom).map(c => ({ name: `C-${c.id}`, volConsom: c.volConsom, volFact: c.volFact }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatFullNumber(v)} />
              <Legend />
              <Bar dataKey="volConsom" name="Vol. Consommé" fill="#1e40af" radius={[4,4,0,0]} />
              <Bar dataKey="volFact" name="Vol. Facturé" fill="#60a5fa" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau détaillé Client - paginé */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">Tableau Détail par Client</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Rechercher..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setClientPage(1); }}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-500">{clientData.total} clients</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {loadingClients ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">N° Client</TableHead>
                      <TableHead className="font-semibold">AGR</TableHead>
                      <TableHead className="font-semibold">Secteur</TableHead>
                      <TableHead className="font-semibold">Culture</TableHead>
                      <TableHead className="text-right font-semibold">Nb Enr.</TableHead>
                      <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                      <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                      <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                      <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                      <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                      <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientData.clients.map((row: any) => {
                      const cultPct = ((row.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                      const dphPct = ((row.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                      const totPct = ((row.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                      return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.id}</TableCell>
                        <TableCell>{row.agr}</TableCell>
                        <TableCell>{row.secteur}</TableCell>
                        <TableCell>{row.cult}</TableCell>
                        <TableCell className="text-right">{formatFullNumber(row.count)}</TableCell>
                        <TableCell className="text-right text-emerald-700">{formatCurrency(row.redevCult)}</TableCell>
                        <TableCell className="text-right">{cultPct}%</TableCell>
                        <TableCell className="text-right text-blue-700">{formatCurrency(row.redevDph)}</TableCell>
                        <TableCell className="text-right">{dphPct}%</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.redevTot)}</TableCell>
                        <TableCell className="text-right">{totPct}%</TableCell>
                      </TableRow>
                    );})}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                      <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between py-3">
                  <Button variant="outline" size="sm" onClick={() => setClientPage(p => Math.max(1, p - 1))} disabled={clientPage <= 1}>Précédent</Button>
                  <span className="text-xs text-gray-500">Page {clientPage} / {clientData.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setClientPage(p => Math.min(clientData.totalPages, p + 1))} disabled={clientPage >= clientData.totalPages}>Suivant</Button>
                </div>
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function CDASection({ fd }: { fd: FilteredData }) {
  const cdaEntries = Object.entries(fd.byCDA)
    .map(([id, v]: [string, any]) => ({ id, ...v }))
    .filter(c => c.id !== '0' && c.id !== 'NaN' && c.count > 0)
    .sort((a, b) => b.redevTot - a.redevTot);

  const totalCDA = cdaEntries.length;
  const avgRedevPerCDA = fd.summary.totalRedevTot / (totalCDA || 1);
  const avgVolPerCDA = fd.summary.totalVolConsom / (totalCDA || 1);

  const topCDAByRevenue = cdaEntries.slice(0, 10).map(c => ({ name: `CDA-${c.id}`, value: c.redevTot }));
  const cdaBarChartData = cdaEntries.slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-md border-l-4 border-l-teal-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Nombre de CDA</p>
            <p className="text-2xl font-bold text-teal-700 mt-1">{formatFullNumber(totalCDA)}</p>
            <p className="text-xs text-gray-400 mt-1">CDAs uniques</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Vol. Moyen / CDA</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{formatNumber(avgVolPerCDA)}</p>
            <p className="text-xs text-gray-400 mt-1">m³ en moyenne</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Redev. Moyenne / CDA</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(avgRedevPerCDA)}</p>
            <p className="text-xs text-gray-400 mt-1">DH en moyenne</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">Redev. Totale</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(fd.summary.totalRedevTot)}</p>
            <p className="text-xs text-gray-400 mt-1">tous CDA confondus</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 20 CDA par Redevance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={cdaBarChartData.map(c => ({ name: `CDA-${c.id}`, redevCult: c.redevCult, redevDph: c.redevDph, redevTot: c.redevTot }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="redevCult" name="Redev. Culture" stackId="a" fill="#10b981" />
                <Bar dataKey="redevDph" name="Redev. DPH" stackId="a" fill="#3b82f6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Répartition Top 10 CDA par Redevance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={topCDAByRevenue}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {topCDAByRevenue.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Top 20 CDA par Volume Consommé</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={cdaEntries.slice(0, 20).sort((a, b) => b.volConsom - a.volConsom).map(c => ({ name: `CDA-${c.id}`, volConsom: c.volConsom, volFact: c.volFact }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatFullNumber(v)} />
              <Legend />
              <Bar dataKey="volConsom" name="Vol. Consommé" fill="#0d9488" radius={[4,4,0,0]} />
              <Bar dataKey="volFact" name="Vol. Facturé" fill="#5eead4" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau détaillé CDA */}
      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-800">Tableau Détail par CDA</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">N° CDA</TableHead>
                  <TableHead className="text-right font-semibold">Nb Clients</TableHead>
                  <TableHead className="text-right font-semibold">Nb Enregistrements</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Culture</TableHead>
                  <TableHead className="text-right font-semibold">% Culture (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. DPH</TableHead>
                  <TableHead className="text-right font-semibold">% DPH (du total)</TableHead>
                  <TableHead className="text-right font-semibold">Redev. Totale</TableHead>
                  <TableHead className="text-right font-semibold">% Redev. Tot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cdaEntries.map((row: any) => {
                  const cultPct = ((row.redevCult / (fd.summary.totalRedevCult || 1)) * 100).toFixed(1);
                  const dphPct = ((row.redevDph / (fd.summary.totalRedevDph || 1)) * 100).toFixed(1);
                  const totPct = ((row.redevTot / (fd.summary.totalRedevTot || 1)) * 100).toFixed(1);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.id}</TableCell>
                      <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(row.clientCount)}</TableCell>
                      <TableCell className="text-right">{formatFullNumber(row.count)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(row.redevCult)}</TableCell>
                      <TableCell className="text-right">{cultPct}%</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(row.redevDph)}</TableCell>
                      <TableCell className="text-right">{dphPct}%</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(row.redevTot)}</TableCell>
                      <TableCell className="text-right">{totPct}%</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{formatFullNumber(fd.clientStats?.totalClientCount || 0)}</TableCell>
                  <TableCell className="text-right">{formatFullNumber(fd.summary.totalRows)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(fd.summary.totalRedevCult)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(fd.summary.totalRedevDph)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">{formatCurrency(fd.summary.totalRedevTot)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component - uses server-side filtering via API query params
export default function DashboardPage() {
  const [filtersData, setFiltersData] = useState<DashboardData['filters'] | null>(null);
  const [fd, setFd] = useState<FilteredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    agr: 'all', secteur: 'all', source: 'all', cult: 'all', campagne: 'all', semestre: 'all',
  });

  const fetchFilteredData = useCallback(async (currentFilters: FilterState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.agr !== 'all') params.set('agr', currentFilters.agr);
      if (currentFilters.secteur !== 'all') params.set('secteur', currentFilters.secteur);
      if (currentFilters.source !== 'all') params.set('source', currentFilters.source);
      if (currentFilters.cult !== 'all') params.set('cult', currentFilters.cult);
      if (currentFilters.campagne !== 'all') params.set('campagne', currentFilters.campagne);
      if (currentFilters.semestre !== 'all') params.set('semestre', currentFilters.semestre);
      const qs = params.toString();
      const res = await fetch(`/api/data${qs ? '?' + qs : ''}`);
      const json = await res.json();
      setFd(json);
      if (json.filters) setFiltersData(json.filters);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchFilteredData(filters);
  }, []);

  // Refetch when filters change
  React.useEffect(() => {
    fetchFilteredData(filters);
  }, [filters, fetchFilteredData]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        setUploadMessage('Fichier chargé avec succès !');
        await fetchFilteredData(filters);
      } else {
        setUploadMessage(json.error || 'Erreur lors du chargement');
      }
    } catch {
      setUploadMessage('Erreur lors du chargement du fichier');
    }
    setUploading(false);
    if (e.target) e.target.value = '';
    setTimeout(() => setUploadMessage(''), 4000);
  }, [fetchFilteredData, filters]);

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ agr: 'all', secteur: 'all', source: 'all', cult: 'all', campagne: 'all', semestre: 'all' });
  }, []);

  const handleSidebarUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleHeaderUploadClick = useCallback(() => {
    headerFileInputRef.current?.click();
  }, []);

  if (loading || !fd || !filtersData) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-[#1e3a5f] flex-shrink-0 hidden lg:flex flex-col">
          <div className="p-6"><Skeleton className="h-8 w-32 bg-blue-800" /></div>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="px-4 py-3"><Skeleton className="h-10 w-full bg-blue-800/50" /></div>
          ))}
        </div>
        <div className="flex-1 p-8">
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const sectionTitle = NAV_ITEMS.find(i => i.id === activeSection)?.label || 'Dashboard';

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <OverviewSection fd={fd} />;
      case 'agr': return <AGRSection fd={fd} />;
      case 'culture': return <CultureSection fd={fd} />;
      case 'secteur': return <SecteurSection fd={fd} />;
      case 'source': return <SourceSection fd={fd} />;
      case 'finance': return <FinanceSection fd={fd} />;
      case 'cross': return <CrossAnalysisSection fd={fd} />;
      case 'client': return <ClientSection fd={fd} clientStats={fd.clientStats || { totalClientCount: 0, totalClientRedevTot: 0, top10ClientRedev: 0, concentrationPct: '0' }} globalFilters={filters} />;
      case 'cda': return <CDASection fd={fd} />;
      default: return <OverviewSection fd={fd} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
      <input ref={headerFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />

      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300`}>
        <SidebarComponent
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeSection={activeSection}
          setActiveSection={(v) => { setActiveSection(v); setMobileSidebarOpen(false); }}
          uploading={uploading}
          uploadMessage={uploadMessage}
          onUploadClick={handleSidebarUploadClick}
          fd={fd}
        />
      </div>
      <div className="hidden lg:flex">
        <SidebarComponent
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          uploading={uploading}
          uploadMessage={uploadMessage}
          onUploadClick={handleSidebarUploadClick}
          fd={fd}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{sectionTitle}</h2>
              <p className="text-xs text-gray-400">Exercice 2025 — Rôle Définitif</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleHeaderUploadClick} disabled={uploading} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="hidden sm:inline">{uploading ? 'Chargement...' : 'Charger Excel'}</span>
            </Button>
            {uploadMessage && (
              <Badge variant={uploadMessage.includes('succès') ? 'default' : 'destructive'} className="text-xs">
                {uploadMessage}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchFilteredData(filters)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="space-y-6">
            <FilterBarComponent filters={filters} data={{ filters: filtersData } as DashboardData} updateFilter={updateFilter} resetFilters={resetFilters} />
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
