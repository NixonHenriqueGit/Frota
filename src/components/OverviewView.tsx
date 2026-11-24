import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Droplets,
  FileCheck2,
  FileText,
  Filter,
  Fuel,
  Gauge,
  Hash,
  KeyRound,
  LayoutGrid,
  Maximize2,
  Package,
  PieChart,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  ChecklistKey,
  Company,
  DashboardFilters,
  NavSection,
  Sector,
  Vehicle,
  VehicleCategory,
  VehicleDocumentRecord,
  VehicleEvidenceRecord,
  VehicleStatus,
} from '../types/fleet';
import {
  CATEGORY_META,
  CHECKLIST_ITEMS,
  SECTOR_META,
  resolveVehiclePhoto,
} from '../data/fleetSeed';
import { formatCurrencyBRL, formatKmOrHours } from '../utils/formatters';
import { sanitizeFleetAgeYearMonths } from '../utils/fleetSpreadsheet';
import { DonutChart } from './DonutChart';
import { SectorBarChart } from './SectorBarChart';
import { EvidenceStatusBadge, VehicleStatusBadge } from './StatusBadges';

interface OverviewViewProps {
  vehicles: Vehicle[];
  documents: VehicleDocumentRecord[];
  evidences: VehicleEvidenceRecord[];
  filters: DashboardFilters;
  selectedVehicleId: string;
  onFiltersChange: (next: DashboardFilters) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onToggleChecklistItem: (vehicleId: string, key: ChecklistKey) => void;
  onNavigate: (section: NavSection) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onUpdateVehiclePhoto?: (vehicleId: string, photoUrl: string) => void;
  onAddVehicle: () => void;
  onOpenImportModal?: () => void;
  onLoadDefaultFleet?: () => void;
}

const PREVIEW_CHECKLIST_KEYS: ChecklistKey[] = [
  'chaveRoda',
  'pneus',
  'triangulo',
  'extintor',
  'sensorCinto',
];

export const OverviewView: React.FC<OverviewViewProps> = ({
  vehicles,
  documents,
  evidences,
  filters,
  selectedVehicleId,
  onFiltersChange,
  onSelectVehicle,
  onToggleChecklistItem,
  onNavigate,
  onEditVehicle,
  onUpdateVehiclePhoto,
  onAddVehicle,
  onLoadDefaultFleet,
}) => {
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const pageSize = 6;

  const handlePhotoUpload = (file: File, vehicleId: string) => {
    if (!onUpdateVehiclePhoto) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onUpdateVehiclePhoto(vehicleId, result.slice(0, 420000));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let compressed = canvas.toDataURL('image/jpeg', 0.82);
        for (const q of [0.7, 0.56, 0.42]) {
          if (compressed.length <= 420000) break;
          compressed = canvas.toDataURL('image/jpeg', q);
        }
        onUpdateVehiclePhoto(vehicleId, compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const filteredVehicles = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (filters.period === '30d' && v.periodBucket !== '30d') return false;
      if (filters.period === '6m' && v.periodBucket === '12m') return false;
      if (filters.company !== 'Todas' && v.company !== filters.company) return false;
      if (filters.sector !== 'Todos' && v.sector !== filters.sector) return false;
      if (filters.category !== 'Todos' && v.category !== filters.category) return false;
      if (filters.status !== 'Todos' && v.status !== filters.status) return false;
      if (q) {
        const matchesVehicle =
          v.plate.toLowerCase().includes(q) ||
          v.manufacturerModel.toLowerCase().includes(q) ||
          v.sector.toLowerCase().includes(q);
        if (!matchesVehicle) return false;
      }
      return true;
    });
  }, [vehicles, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const activeCount = useMemo(
    () => filteredVehicles.filter((v) => v.status === 'Ativo').length,
    [filteredVehicles]
  );
  const stoppedCount = useMemo(
    () => filteredVehicles.filter((v) => v.status === 'Parado').length,
    [filteredVehicles]
  );
  const checkedVehiclesCount = useMemo(
    () =>
      filteredVehicles.filter((v) =>
        CHECKLIST_ITEMS.every((item) => Boolean(v.checklist[item.key]))
      ).length,
    [filteredVehicles]
  );

  const activeRate =
    filteredVehicles.length > 0
      ? Math.round((activeCount / filteredVehicles.length) * 100)
      : 0;
  const stoppedRate =
    filteredVehicles.length > 0
      ? Math.round((stoppedCount / filteredVehicles.length) * 100)
      : 0;
  const checkedRate =
    filteredVehicles.length > 0
      ? Math.round((checkedVehiclesCount / filteredVehicles.length) * 100)
      : 0;

  const donutData = useMemo(() => {
    const order: VehicleCategory[] = [
      'Caminhão',
      'Carga Semi-Reboque',
      'Empilhadeira',
      'Frota Leve',
      'Tração Caminhão Trator',
    ];
    return order.map((cat) => ({
      category: cat,
      label: CATEGORY_META[cat].pluralLabel,
      count: filteredVehicles.filter((v) => v.category === cat).length,
      color: CATEGORY_META[cat].color,
    }));
  }, [filteredVehicles]);

  const sectorData = useMemo(() => {
    const order: Sector[] = ['Distribuição', 'Vendas', 'Puxada', 'Armazém', 'Marketing'];
    return order.map((sector) => ({
      sector,
      count: filteredVehicles.filter((v) => v.sector === sector).length,
      color: SECTOR_META[sector].color,
    }));
  }, [filteredVehicles]);

  const visibleEvidences = useMemo(() => {
    const filteredIds = new Set(filteredVehicles.map((v) => v.id));
    return evidences.filter((e) => filteredIds.has(e.vehicleId)).slice(0, 5);
  }, [evidences, filteredVehicles]);

  const selectedVehicle = useMemo(() => {
    return (
      filteredVehicles.find((v) => v.id === selectedVehicleId) ??
      filteredVehicles[0] ??
      vehicles[0]
    );
  }, [filteredVehicles, selectedVehicleId, vehicles]);

  const selectedIndex = useMemo(() => {
    if (!selectedVehicle || filteredVehicles.length === 0) return -1;
    return filteredVehicles.findIndex((v) => v.id === selectedVehicle.id);
  }, [filteredVehicles, selectedVehicle]);

  const handleCycleVehicle = (delta: number) => {
    if (filteredVehicles.length === 0) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIdx = (base + delta + filteredVehicles.length) % filteredVehicles.length;
    onSelectVehicle(filteredVehicles[nextIdx].id);
  };

  const hasActiveFilters =
    filters.period !== '12m' ||
    filters.company !== 'Todas' ||
    filters.sector !== 'Todos' ||
    filters.category !== 'Todos' ||
    filters.status !== 'Todos' ||
    filters.search.trim() !== '';

  const resetFilters = () => {
    setPage(1);
    onFiltersChange({
      period: '12m',
      company: 'Todas',
      sector: 'Todos',
      category: 'Todos',
      status: 'Todos',
      search: '',
    });
  };

  const selectedVehicleChecklistStats = useMemo(() => {
    if (!selectedVehicle) return { done: 0, total: CHECKLIST_ITEMS.length, pct: 0 };
    const done = CHECKLIST_ITEMS.filter((item) => selectedVehicle.checklist[item.key]).length;
    const total = CHECKLIST_ITEMS.length;
    return {
      done,
      total,
      pct: Math.round((done / total) * 100),
    };
  }, [selectedVehicle]);

  const selectedVehicleHasExpiredDoc = useMemo(() => {
    if (!selectedVehicle) return false;
    return documents.some(
      (d) => d.vehicleId === selectedVehicle.id && d.status === 'Vencido'
    );
  }, [documents, selectedVehicle]);

  // Compute dot window (max 5 dots centered around active index)
  const carouselDots = useMemo(() => {
    const count = filteredVehicles.length;
    if (count === 0) return [];
    const maxDots = 5;
    if (count <= maxDots) {
      return filteredVehicles.map((v, idx) => ({ id: v.id, idx }));
    }
    const half = Math.floor(maxDots / 2);
    let start = Math.max(0, (selectedIndex >= 0 ? selectedIndex : 0) - half);
    if (start + maxDots > count) {
      start = count - maxDots;
    }
    return Array.from({ length: maxDots }, (_, offset) => {
      const idx = start + offset;
      return { id: filteredVehicles[idx].id, idx };
    });
  }, [filteredVehicles, selectedIndex]);

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Row 1: 4 Soft Pastel-Wave KPI Cards */}
      <section className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Veículos Cadastrados */}
        <button
          type="button"
          onClick={() => onFiltersChange({ ...filters, status: 'Todos' })}
          className="relative overflow-hidden rounded-2xl border border-[#DCE8FC] bg-gradient-to-br from-[#F4F8FF] via-[#EDF4FF] to-[#E3EEFF] px-4 py-2.5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
        >
          <svg
            viewBox="0 0 260 72"
            preserveAspectRatio="none"
            className="pointer-events-none absolute right-0 bottom-0 h-11 w-3/4 opacity-50"
            aria-hidden="true"
          >
            <path
              d="M0 72 C65 44, 155 62, 260 12 L260 72 Z"
              fill="#CFE2FF"
            />
          </svg>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9E9FF] text-[#1565D8] shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
                  {filteredVehicles.length}
                </span>
                <span className="text-[0.74rem] font-bold text-[#16A34A] tabular-nums whitespace-nowrap">
                  ↑ {filteredVehicles.length > 0 ? `${activeRate}% ativos` : '0%'}
                </span>
              </div>
              <div className="mt-1 text-[0.8rem] font-semibold text-slate-600 truncate">
                Veículos Cadastrados
              </div>
            </div>
          </div>
        </button>

        {/* Card 2: Veículos Ativos */}
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              ...filters,
              status: filters.status === 'Ativo' ? 'Todos' : 'Ativo',
            })
          }
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#F2FBF6] via-[#E9F9F0] to-[#DCF5E7] px-4 py-2.5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer ${
            filters.status === 'Ativo'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-[#D1F0DE]'
          }`}
        >
          <svg
            viewBox="0 0 260 72"
            preserveAspectRatio="none"
            className="pointer-events-none absolute right-0 bottom-0 h-11 w-3/4 opacity-50"
            aria-hidden="true"
          >
            <path
              d="M0 72 C65 44, 155 62, 260 12 L260 72 Z"
              fill="#BFEFD2"
            />
          </svg>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#19A255] text-white shrink-0 shadow-sm">
              <Check className="w-5 h-5 stroke-[2.75]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
                  {activeCount}
                </span>
                <span className="text-[0.74rem] font-bold text-[#16A34A] tabular-nums whitespace-nowrap">
                  ↑ {activeRate}%
                </span>
              </div>
              <div className="mt-1 text-[0.8rem] font-semibold text-slate-600 truncate">
                Veículos Ativos
              </div>
            </div>
          </div>
        </button>

        {/* Card 3: Veículos Pendentes */}
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              ...filters,
              status: filters.status === 'Parado' ? 'Todos' : 'Parado',
            })
          }
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#FFF9F2] via-[#FFF3E6] to-[#FFEAD6] px-4 py-2.5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer ${
            filters.status === 'Parado'
              ? 'border-orange-500 ring-2 ring-orange-500/20'
              : 'border-[#FCE1C6]'
          }`}
        >
          <svg
            viewBox="0 0 260 72"
            preserveAspectRatio="none"
            className="pointer-events-none absolute right-0 bottom-0 h-11 w-3/4 opacity-55"
            aria-hidden="true"
          >
            <path
              d="M0 72 C65 44, 155 62, 260 12 L260 72 Z"
              fill="#FCD8B6"
            />
          </svg>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDE0C2] text-[#E66B0E] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
                  {stoppedCount}
                </span>
                <span className="text-[0.74rem] font-bold text-[#16A34A] tabular-nums whitespace-nowrap">
                  ↑ {stoppedRate}%
                </span>
              </div>
              <div className="mt-1 text-[0.8rem] font-semibold text-slate-600 truncate">
                Veículos Pendentes
              </div>
            </div>
          </div>
        </button>

        {/* Card 4: Checagens de Veículos */}
        <button
          type="button"
          onClick={() => onNavigate('checklists')}
          className="relative overflow-hidden rounded-2xl border border-[#DCE8FC] bg-gradient-to-br from-[#F4F8FF] via-[#ECF3FF] to-[#E1ECFE] px-4 py-2.5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
        >
          <svg
            viewBox="0 0 260 72"
            preserveAspectRatio="none"
            className="pointer-events-none absolute right-0 bottom-0 h-11 w-3/4 opacity-50"
            aria-hidden="true"
          >
            <path
              d="M0 72 C65 44, 155 62, 260 12 L260 72 Z"
              fill="#CFE2FF"
            />
          </svg>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9E9FF] text-[#1565D8] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
                  {checkedVehiclesCount}
                </span>
                <span className="text-[0.74rem] font-bold text-[#16A34A] tabular-nums whitespace-nowrap">
                  ↑ {checkedRate}%
                </span>
              </div>
              <div className="mt-1 text-[0.8rem] font-semibold text-slate-600 truncate">
                Checagens de Veículos
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* Row 2: Composição da Frota + Frota por Setor + Evidências Anexadas */}
      <section className="lg:flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Composição da Frota */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#114F9E] text-white">
            <div className="flex items-center gap-2 min-w-0">
              <PieChart className="w-4 h-4 text-blue-200 shrink-0" />
              <h2 className="font-display text-[0.88rem] font-bold truncate">
                Composição da Frota
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {filters.category !== 'Todos' && (
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, category: 'Todos' })}
                  className="text-xs font-medium text-amber-200 hover:text-white underline cursor-pointer"
                >
                  Limpar ({filters.category})
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('cadastro')}
                className="inline-flex items-center gap-1 text-[0.78rem] font-medium text-blue-100 hover:text-white cursor-pointer whitespace-nowrap"
              >
                <span>Ver Detalhes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="px-4 py-2.5 flex-1 flex items-center">
            <div className="w-full">
              <DonutChart
                data={donutData}
                total={filteredVehicles.length}
                selectedCategory={filters.category}
                onSelectCategory={(cat) => {
                  setPage(1);
                  onFiltersChange({ ...filters, category: cat });
                }}
              />
            </div>
          </div>
        </div>

        {/* Frota por Setor */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#114F9E] text-white">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 className="w-4 h-4 text-blue-200 shrink-0" />
              <h2 className="font-display text-[0.88rem] font-bold truncate">
                Frota por Setor
              </h2>
            </div>
            {filters.sector !== 'Todos' && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, sector: 'Todos' })}
                className="text-xs font-medium text-amber-200 hover:text-white underline cursor-pointer"
              >
                Limpar ({filters.sector})
              </button>
            )}
          </div>
          <div className="px-4 py-2.5 flex-1">
            <SectorBarChart
              data={sectorData}
              selectedSector={filters.sector}
              onSelectSector={(sector) => {
                setPage(1);
                onFiltersChange({ ...filters, sector });
              }}
            />
          </div>
        </div>

        {/* Evidências Anexadas */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#114F9E] text-white">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck2 className="w-4 h-4 text-blue-200 shrink-0" />
              <h2 className="font-display text-[0.88rem] font-bold truncate">
                Evidências Anexadas
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('evidencias')}
              className="inline-flex items-center gap-1 text-[0.78rem] font-medium text-blue-100 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <span>Ver Todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className={`w-full text-left border-collapse text-[0.8rem] ${visibleEvidences.length > 0 ? 'flex-1 h-full' : ''}`}>
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-1.5 px-3">Placa</th>
                  <th className="py-1.5 px-2 text-center">CRLV</th>
                  <th className="py-1.5 px-2 text-center">CNT</th>
                  <th className="py-1.5 px-2 text-center">ANTT</th>
                  <th className="py-1.5 px-3 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEvidences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nenhuma evidência anexada.
                    </td>
                  </tr>
                ) : (
                  visibleEvidences.map((ev) => {
                    const allOk = ev.crlv && ev.cnt && ev.antt;
                    return (
                      <tr
                        key={ev.vehicleId}
                        onClick={() => onSelectVehicle(ev.vehicleId)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-1.5 px-3 font-mono-tabular font-bold text-[#06295A] whitespace-nowrap">
                          {ev.plate}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {ev.crlv ? (
                            <CheckCircle2 className="w-4 h-4 text-[#19A255] inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 inline-block" />
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {ev.cnt ? (
                            <CheckCircle2 className="w-4 h-4 text-[#19A255] inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 inline-block" />
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {ev.antt ? (
                            <CheckCircle2 className="w-4 h-4 text-[#19A255] inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 inline-block" />
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <EvidenceStatusBadge
                            status={allOk ? 'Anexado' : 'Pendente'}
                            label={allOk ? 'Aprovado' : 'Pendente'}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Row 3: Veículos da Frota + Detalhes do Veículo (side by side) */}
      <section className="lg:flex-[1.2] grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Veículos da Frota */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#114F9E] text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Truck className="w-4 h-4 text-blue-200 shrink-0" />
              <h2 className="font-display text-[0.88rem] font-bold">Veículos da Frota</h2>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs">
                <Search className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => {
                    setPage(1);
                    onFiltersChange({ ...filters, search: e.target.value });
                  }}
                  placeholder="Placa ou modelo..."
                  aria-label="Buscar veículo por placa ou modelo"
                  className="w-28 md:w-36 bg-transparent text-xs text-white placeholder:text-blue-200/75 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  filtersOpen || hasActiveFilters
                    ? 'bg-white text-[#072B5E]'
                    : 'bg-white/15 text-blue-100 hover:bg-white/25 hover:text-white'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>Filtros</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('cadastro')}
                className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-blue-100 hover:text-white cursor-pointer whitespace-nowrap"
              >
                <span>Ver Todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expandable Filter Strip */}
          {(filtersOpen || hasActiveFilters) && (
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Calendar className="w-3.5 h-3.5 text-[#0A2E5C] shrink-0" />
                <select
                  value={filters.period}
                  onChange={(e) => {
                    setPage(1);
                    onFiltersChange({
                      ...filters,
                      period: e.target.value as DashboardFilters['period'],
                    });
                  }}
                  aria-label="Filtrar por período"
                  className="w-full bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="12m">12 meses</option>
                  <option value="6m">6 meses</option>
                  <option value="30d">30 dias</option>
                  <option value="all">Todo histórico</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Building2 className="w-3.5 h-3.5 text-[#0A2E5C] shrink-0" />
                <select
                  value={filters.company}
                  onChange={(e) => {
                    setPage(1);
                    onFiltersChange({
                      ...filters,
                      company: e.target.value as 'Todas' | Company,
                    });
                  }}
                  aria-label="Filtrar por empresa"
                  className="w-full bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="Todas">Empresa: Todas</option>
                  <option value="Pau Brasil Brejo">Pau Brasil Brejo</option>
                  <option value="Pau Brasil Matriz">Pau Brasil Matriz</option>
                  <option value="Terceirizados">Terceirizados</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <LayoutGrid className="w-3.5 h-3.5 text-[#0A2E5C] shrink-0" />
                <select
                  value={filters.sector}
                  onChange={(e) => {
                    setPage(1);
                    onFiltersChange({
                      ...filters,
                      sector: e.target.value as 'Todos' | Sector,
                    });
                  }}
                  aria-label="Filtrar por setor"
                  className="w-full bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="Todos">Setor: Todos</option>
                  <option value="Distribuição">Distribuição</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Puxada">Puxada</option>
                  <option value="Armazém">Armazém</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Truck className="w-3.5 h-3.5 text-[#0A2E5C] shrink-0" />
                <select
                  value={filters.category}
                  onChange={(e) => {
                    setPage(1);
                    onFiltersChange({
                      ...filters,
                      category: e.target.value as 'Todos' | VehicleCategory,
                    });
                  }}
                  aria-label="Filtrar por tipo"
                  className="w-full bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="Todos">Tipo: Todos</option>
                  <option value="Caminhão">Caminhão</option>
                  <option value="Carga Semi-Reboque">Carga Semi-Reboque</option>
                  <option value="Empilhadeira">Empilhadeira</option>
                  <option value="Frota Leve">Frota Leve</option>
                  <option value="Tração Caminhão Trator">Tração Caminhão Trator</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <UserCheck className="w-3.5 h-3.5 text-[#0A2E5C] shrink-0" />
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setPage(1);
                    onFiltersChange({
                      ...filters,
                      status: e.target.value as 'Todos' | VehicleStatus,
                    });
                  }}
                  aria-label="Filtrar por status"
                  className="w-full bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="Todos">Status: Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Parado">Parado</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className={`w-full text-left border-collapse text-[0.77rem] ${paginatedVehicles.length > 0 ? 'flex-1 h-full' : ''}`}>
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-1.5 px-2 whitespace-nowrap">Placa</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Tipo</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Setor</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Status</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Fabricante/Modelo</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Ano Fab./Mod.</th>
                  <th className="py-1.5 px-2 whitespace-nowrap text-right">Km/Horas</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Proprietário</th>
                  <th className="py-1.5 px-2 whitespace-nowrap text-center">Idade / HB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500">
                      {vehicles.length === 0 ? (
                        <div className="space-y-2">
                          <p>Nenhum veículo cadastrado na plataforma.</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={onAddVehicle}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0A2E5C] text-white text-xs font-semibold hover:bg-[#0D3C78] cursor-pointer"
                            >
                              Cadastrar Primeiro Veículo
                            </button>
                            {onLoadDefaultFleet && (
                              <button
                                type="button"
                                onClick={onLoadDefaultFleet}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                              >
                                Carregar Frota Padrão
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          Nenhum veículo encontrado para os filtros aplicados.{' '}
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="text-[#0A2E5C] font-semibold underline cursor-pointer"
                          >
                            Limpar filtros
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => onSelectVehicle(v.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 font-medium'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        <td className="py-1.5 px-2 font-mono-tabular font-bold text-[#06295A] whitespace-nowrap">
                          {v.plate}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700 whitespace-nowrap max-w-[125px] truncate" title={v.category}>
                          {v.category}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700 whitespace-nowrap">
                          {v.sector}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <VehicleStatusBadge status={v.status} />
                        </td>
                        <td className="py-1.5 px-2 text-slate-800 whitespace-nowrap max-w-[165px] truncate" title={v.manufacturerModel}>
                          {v.manufacturerModel}
                        </td>
                        <td className="py-1.5 px-2 font-mono-tabular text-slate-600 whitespace-nowrap">
                          {v.yearFab} / {v.yearMod}
                        </td>
                        <td className="py-1.5 px-2 font-mono-tabular text-slate-700 text-right whitespace-nowrap">
                          {formatKmOrHours(v.kmOrHours, v.unit)}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700 whitespace-nowrap">
                          {v.ownership}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono-tabular text-slate-600 whitespace-nowrap">
                          {sanitizeFleetAgeYearMonths(v.fleetAgeYearMonths) ||
                            (v.hbFrota ? 'Sim' : 'Não')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 border-t border-slate-100 bg-white text-xs">
            <span className="text-[0.76rem] font-semibold text-slate-500 tabular-nums">
              Total: {filteredVehicles.length} veículos
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                }
                const active = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1565D8] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Próxima página"
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Detalhes do Veículo */}
        <div className="lg:col-span-5 flex flex-col">
          {selectedVehicle ? (
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#114F9E] text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <CarFront className="w-4 h-4 text-blue-200 shrink-0" />
                  <h2 className="font-display text-[0.88rem] font-bold whitespace-nowrap">
                    Detalhes do Veículo
                  </h2>
                  <span className="text-[0.78rem] font-semibold text-blue-100/95 font-mono-tabular truncate">
                    {selectedVehicle.plate} - {selectedVehicle.manufacturerModel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onEditVehicle(selectedVehicle)}
                  className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-blue-100 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Editar Cadastro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-4 py-2.5 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 items-center content-center">
                {/* Top-Left: Photo Carousel */}
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePhotoUpload(file, selectedVehicle.id);
                      }
                      e.target.value = '';
                    }}
                  />
                  {(() => {
                    const displayPhoto = resolveVehiclePhoto(
                      selectedVehicle.plate,
                      selectedVehicle.category,
                      selectedVehicle.photoUrl
                    );
                    return (
                      <div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCycleVehicle(-1)}
                            aria-label="Veículo anterior"
                            className="p-0.5 rounded-full text-[#1565D8] hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="group relative flex-1 h-[5.75rem] xl:h-[6.5rem] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                            <button
                              type="button"
                              onClick={() => setPhotoPreviewOpen(true)}
                              title="Clique para ampliar a foto do veículo"
                              className="w-full h-full block cursor-pointer"
                            >
                              <img
                                src={displayPhoto}
                                alt={`${selectedVehicle.manufacturerModel} (${selectedVehicle.plate})`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </button>

                            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setPhotoPreviewOpen(true)}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white cursor-pointer"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                                Ampliar
                              </button>
                              {onUpdateVehiclePhoto && (
                                <button
                                  type="button"
                                  onClick={() => photoInputRef.current?.click()}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#1565D8]/90 px-1.5 py-0.5 text-[10px] font-semibold text-white cursor-pointer"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  Trocar
                                </button>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCycleVehicle(1)}
                            aria-label="Próximo veículo"
                            className="p-0.5 rounded-full text-[#1565D8] hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Carousel Dots + Subtle Change Photo Action */}
                        <div className="mt-1.5 flex items-center justify-center gap-1.5">
                          {carouselDots.map((dot) => {
                            const active = dot.id === selectedVehicle.id;
                            return (
                              <button
                                key={dot.id}
                                type="button"
                                onClick={() => onSelectVehicle(dot.id)}
                                aria-label={`Selecionar veículo ${dot.idx + 1}`}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                  active
                                    ? 'w-3.5 bg-[#1565D8]'
                                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                                }`}
                              />
                            );
                          })}
                          {onUpdateVehiclePhoto && (
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              title="Alterar foto deste veículo"
                              className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1565D8] hover:underline cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Trocar foto</span>
                            </button>
                          )}
                        </div>

                        {photoPreviewOpen && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-[1px]"
                            onClick={() => setPhotoPreviewOpen(false)}
                          >
                            <div
                              className="relative max-w-4xl w-full rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between px-4 py-3 bg-[#072B5E] text-white">
                                <span className="font-display text-sm font-bold">
                                  {selectedVehicle.plate} · {selectedVehicle.manufacturerModel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPhotoPreviewOpen(false)}
                                  aria-label="Fechar visualização"
                                  className="p-1 rounded hover:bg-white/15 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="bg-slate-950 flex items-center justify-center p-2 max-h-[80vh]">
                                <img
                                  src={displayPhoto}
                                  alt={`${selectedVehicle.manufacturerModel} (${selectedVehicle.plate})`}
                                  className="max-h-[75vh] w-auto object-contain rounded"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Top-Right: Checklist do Veículo with Circular Progress Gauge */}
                <div className="sm:border-l sm:border-slate-100 sm:pl-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-display text-[0.8rem] font-bold text-[#06295A]">
                      Checklist do Veículo
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigate('checklists')}
                      className="text-[0.74rem] font-semibold text-[#1565D8] hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Ver todos ({CHECKLIST_ITEMS.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Circular Progress Ring */}
                    {(() => {
                      const ringSize = 68;
                      const stroke = 7;
                      const r = (ringSize - stroke) / 2;
                      const circ = 2 * Math.PI * r;
                      const offset =
                        circ - (selectedVehicleChecklistStats.pct / 100) * circ;
                      return (
                        <div
                          className="relative shrink-0"
                          style={{ width: ringSize, height: ringSize }}
                        >
                          <svg
                            viewBox={`0 0 ${ringSize} ${ringSize}`}
                            className="w-full h-full -rotate-90"
                          >
                            <circle
                              cx={ringSize / 2}
                              cy={ringSize / 2}
                              r={r}
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth={stroke}
                            />
                            <circle
                              cx={ringSize / 2}
                              cy={ringSize / 2}
                              r={r}
                              fill="none"
                              stroke={
                                selectedVehicleChecklistStats.pct === 100
                                  ? '#16A34A'
                                  : '#1565D8'
                              }
                              strokeWidth={stroke}
                              strokeLinecap="round"
                              strokeDasharray={circ}
                              strokeDashoffset={offset}
                              className="transition-all duration-300"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="font-display text-[0.9rem] font-extrabold text-[#06295A] tabular-nums">
                              {selectedVehicleChecklistStats.pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Key Checklist Items */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {PREVIEW_CHECKLIST_KEYS.map((key) => {
                        const def = CHECKLIST_ITEMS.find((item) => item.key === key);
                        if (!def) return null;
                        const checked = selectedVehicle.checklist[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              onToggleChecklistItem(selectedVehicle.id, key)
                            }
                            title="Clique para alternar item"
                            className="w-full flex items-center gap-1.5 text-left text-[0.77rem] leading-tight text-slate-700 hover:text-slate-950 cursor-pointer"
                          >
                            {checked ? (
                              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#19A255] text-white shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                                <X className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                            <span className="truncate font-medium">{def.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom-Left: Technical Specs with Blue Icons */}
                <div className="space-y-1 text-[0.77rem] leading-tight pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Hash className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Placa:</span>
                    </span>
                    <span className="font-mono-tabular font-bold text-[#06295A]">
                      {selectedVehicle.plate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <FileText className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Renavam:</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-800">
                      {selectedVehicle.renavam}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <KeyRound className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Chassi:</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-800 truncate">
                      {selectedVehicle.chassi}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Fuel className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Tanque:</span>
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {selectedVehicle.tankCapacity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Package className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Capacidade:</span>
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {selectedVehicle.cargoCapacity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Droplets className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Combustível:</span>
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {selectedVehicle.fuelType}
                    </span>
                  </div>
                </div>

                {/* Bottom-Right: Values & Compliance with Blue Icons */}
                <div className="space-y-1 text-[0.77rem] leading-tight pt-2 border-t border-slate-100 sm:border-l sm:pl-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <CircleDollarSign className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Valor FIPE:</span>
                    </span>
                    <span className="font-mono-tabular font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrencyBRL(selectedVehicle.fipeValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <TrendingUp className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Valor Atual:</span>
                    </span>
                    <span className="font-mono-tabular font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrencyBRL(selectedVehicle.currentValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Gauge className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Km/Horímetro:</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-800 whitespace-nowrap">
                      {formatKmOrHours(selectedVehicle.kmOrHours, selectedVehicle.unit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <CalendarCheck className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>CRLV:</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-800 whitespace-nowrap">
                      {selectedVehicle.expiryDates.crlv}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <BadgeCheck className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>ANTT:</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-800 whitespace-nowrap">
                      {selectedVehicle.expiryDates.antt || selectedVehicle.expiryDates.ipva}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1565D8] shrink-0" />
                      <span>Conformidade:</span>
                    </span>
                    {selectedVehicleChecklistStats.pct === 100 &&
                    !selectedVehicleHasExpiredDoc ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#15803D] whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#19A255]" />
                        Conformidade OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 whitespace-nowrap">
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                        Com Pendências
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden flex-1 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#114F9E] text-white">
                <h2 className="font-display text-[0.84rem] font-bold">
                  Detalhes do Veículo
                </h2>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 gap-2.5">
                <Truck className="w-7 h-7 text-slate-300" />
                <p>
                  Nenhum veículo selecionado. Cadastre um veículo para visualizar
                  especificações, valores e checklist.
                </p>
                <button
                  type="button"
                  onClick={onAddVehicle}
                  className="px-4 py-1.5 rounded-full bg-[#072B5E] text-white font-semibold hover:bg-[#0D3C78] cursor-pointer"
                >
                  Cadastrar Veículo
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
