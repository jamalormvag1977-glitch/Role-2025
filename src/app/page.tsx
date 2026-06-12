'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  LayoutDashboard, BarChart3, Sprout, MapPin, Droplets, DollarSign,
  Upload, RefreshCw, ChevronDown, Filter, FileSpreadsheet,
  TrendingUp, Users, Zap, Menu
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
  rows: any[];
}

function computeFiltered(rows: any[], filters: FilterState): FilteredData {
  let filtered = rows;
  if (filters.agr !== 'all') filtered = filtered.filter((r: any) => r.AGR === filters.agr);
  if (filters.secteur !== 'all') filtered = filtered.filter((r: any) => r.SECTEUR === filters.secteur);
  if (filters.source !== 'all') filtered = filtered.filter((r: any) => r.SOURCE === filters.source);
  if (filters.cult !== 'all') filtered = filtered.filter((r: any) => r.CULT === filters.cult);
  if (filters.campagne !== 'all') filtered = filtered.filter((r: any) => r.CAMPAGNE === filters.campagne);
  if (filters.semestre !== 'all') filtered = filtered.filter((r: any) => r.SEMESTRE === filters.semestre);

  const summary = { totalRows: filtered.length, totalVolConsom: 0, totalVolFact: 0, totalVolVoleau: 0, totalRedevCult: 0, totalRedevDph: 0, totalRedevTot: 0 };
  const byAGR: Record<string, any> = {};
  const byCult: Record<string, any> = {};
  const bySecteur: Record<string, any> = {};
  const bySource: Record<string, any> = {};
  const bySemestre: Record<string, any> = {};

  for (const row of filtered) {
    summary.totalVolConsom += row.VOL_CONSOM;
    summary.totalVolFact += row.VOL_FACT;
    summary.totalVolVoleau += row.VOL_VOLEAU;
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
  }
  return { summary, byAGR, byCult, bySecteur, bySource, bySemestre, rows: filtered };
}

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
    </div>
  );
}

// Main component using React.use() for data fetching
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        await fetchData();
      } else {
        setUploadMessage(json.error || 'Erreur lors du chargement');
      }
    } catch {
      setUploadMessage('Erreur lors du chargement du fichier');
    }
    setUploading(false);
    if (e.target) e.target.value = '';
    setTimeout(() => setUploadMessage(''), 4000);
  }, [fetchData]);

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

  const fd = data ? computeFiltered(data.rows, filters) : null;

  if (loading || !data || !fd) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-[#1e3a5f] flex-shrink-0 hidden lg:flex flex-col">
          <div className="p-6"><Skeleton className="h-8 w-32 bg-blue-800" /></div>
          {[1,2,3,4,5,6].map(i => (
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
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="space-y-6">
            <FilterBarComponent filters={filters} data={data} updateFilter={updateFilter} resetFilters={resetFilters} />
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
