import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  FileText,
  Maximize2,
  RotateCcw,
  Search,
  Truck,
  X,
} from 'lucide-react';
import {
  ChecklistKey,
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
  SECTOR_META,
  getChecklistItemsForCategory,
  resolveVehiclePhoto,
} from '../data/fleetSeed';
import { formatKmOrHours } from '../utils/formatters';
import { VehicleStatusBadge } from './StatusBadges';

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

export const OverviewView: React.FC<OverviewViewProps> = ({
  vehicles,
  documents,
  evidences,
  filters,
  selectedVehicleId,
  onFiltersChange,
  onSelectVehicle,
  onNavigate,
  onEditVehicle,
  onUpdateVehiclePhoto,
  onAddVehicle,
  onLoadDefaultFleet,
}) => {
  const [page, setPage] = useState(1);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const pageSize = 7;

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
      if (filters.sector !== 'Todos' && v.sector !== filters.sector) return false;
      if (filters.category !== 'Todos' && v.category !== filters.category) return false;
      if (filters.status !== 'Todos' && v.status !== filters.status) return false;
      if (q) {
        return (
          v.plate.toLowerCase().includes(q) ||
          v.manufacturerModel.toLowerCase().includes(q) ||
          v.sector.toLowerCase().includes(q)
        );
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

  const docAlertsCount = useMemo(
    () => documents.filter((d) => d.status === 'Vencido' || d.status === 'A vencer').length,
    [documents]
  );

  const checkedVehiclesCount = useMemo(
    () =>
      filteredVehicles.filter((v) =>
        getChecklistItemsForCategory(v.category).every((item) =>
          Boolean(v.checklist[item.key])
        )
      ).length,
    [filteredVehicles]
  );

  const completeEvidencesCount = useMemo(
    () => evidences.filter((e) => e.crlv && e.cnt && e.antt).length,
    [evidences]
  );

  const sectorSummary = useMemo(() => {
    const order: Sector[] = ['Distribuição', 'Vendas', 'Puxada', 'Armazém'];
    return order.map((sector) => ({
      sector,
      count: vehicles.filter((v) => v.sector === sector).length,
      color: SECTOR_META[sector].color,
    }));
  }, [vehicles]);

  const categorySummary = useMemo(() => {
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
      count: vehicles.filter((v) => v.category === cat).length,
    }));
  }, [vehicles]);

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

  const selectedVehicleChecklistStats = useMemo(() => {
    if (!selectedVehicle) return { done: 0, total: 0, pct: 0 };
    const items = getChecklistItemsForCategory(selectedVehicle.category);
    const done = items.filter((item) => selectedVehicle.checklist[item.key]).length;
    const total = items.length;
    return {
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [selectedVehicle]);

  const selectedVehicleEvidence = useMemo(() => {
    if (!selectedVehicle) return undefined;
    return evidences.find((e) => e.vehicleId === selectedVehicle.id);
  }, [evidences, selectedVehicle]);

  const hasActiveFilters =
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

  return (
    <div className="flex-1 flex flex-col gap-3.5">
      {/* 4 Simple Summary KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onFiltersChange({ ...filters, status: 'Todos' })}
          className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#60A5FA] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Frota Total</span>
            <Truck className="w-4 h-4 text-[#1565D8]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
              {filteredVehicles.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {activeCount} ativos
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('documentos')}
          className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#60A5FA] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Alertas de Vencimento</span>
            <AlertTriangle
              className={`w-4 h-4 ${docAlertsCount > 0 ? 'text-amber-500' : 'text-[#1565D8]'}`}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
              {docAlertsCount}
            </span>
            <span className="text-[11px] font-semibold text-[#1565D8]">
              Ver documentos →
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('evidencias')}
          className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#60A5FA] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Evidências Completas</span>
            <FileText className="w-4 h-4 text-[#1565D8]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
              {completeEvidencesCount}/{evidences.length}
            </span>
            <span className="text-[11px] font-semibold text-[#1565D8]">
              CRLV · CNT · ANTT
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('checklists')}
          className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#60A5FA] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Checklists 100%</span>
            <ClipboardCheck className="w-4 h-4 text-[#1565D8]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
              {checkedVehiclesCount}/{filteredVehicles.length}
            </span>
            <span className="text-[11px] font-semibold text-[#1565D8]">
              Abrir checklists →
            </span>
          </div>
        </button>
      </section>

      {/* Main 2-Column Workspace: Clean Fleet List + Vehicle Quick Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left: Clean Fleet Table (5 essential columns) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-200 shrink-0" />
              <h2 className="font-display text-sm font-bold">
                Veículos da Frota ({filteredVehicles.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('cadastro')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-100 hover:text-white cursor-pointer"
            >
              <span>Cadastro Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Simple Filter Strip */}
          <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setPage(1);
                  onFiltersChange({ ...filters, search: e.target.value });
                }}
                placeholder="Buscar placa ou modelo..."
                className="w-full h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-[#1565D8]"
              />
            </div>

            <select
              value={filters.sector}
              onChange={(e) => {
                setPage(1);
                onFiltersChange({ ...filters, sector: e.target.value as 'Todos' | Sector });
              }}
              aria-label="Filtrar por setor"
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="Todos">Todos os Setores</option>
              <option value="Distribuição">Distribuição</option>
              <option value="Vendas">Vendas</option>
              <option value="Puxada">Puxada</option>
              <option value="Armazém">Armazém</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => {
                setPage(1);
                onFiltersChange({ ...filters, status: e.target.value as 'Todos' | VehicleStatus });
              }}
              aria-label="Filtrar por status"
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="Todos">Todos Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Parado">Parado</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-[#1565D8] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* 5-Column Clean Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-3">Placa</th>
                  <th className="py-2 px-3">Modelo</th>
                  <th className="py-2 px-3">Setor</th>
                  <th className="py-2 px-3">CRLV</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      {vehicles.length === 0 ? (
                        <div className="space-y-2">
                          <p>Nenhum veículo cadastrado ainda.</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={onAddVehicle}
                              className="px-3 py-1.5 rounded-lg bg-[#0B3C7D] text-white text-xs font-semibold cursor-pointer"
                            >
                              Cadastrar Veículo
                            </button>
                            {onLoadDefaultFleet && (
                              <button
                                type="button"
                                onClick={onLoadDefaultFleet}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                Carregar Frota Padrão
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          Nenhum veículo encontrado.{' '}
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="text-[#1565D8] font-semibold underline cursor-pointer"
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
                          isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono-tabular font-bold text-[#06295A] whitespace-nowrap">
                          {v.plate}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 max-w-[200px] truncate">
                          {v.manufacturerModel}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {v.sector}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {v.expiryDates.crlv || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <VehicleStatusBadge status={v.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          {totalPages > 1 && (
            <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between text-xs bg-white">
              <span className="text-slate-500 font-medium">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Clean Selected Vehicle Summary Card */}
        <div className="lg:col-span-5 flex flex-col">
          {selectedVehicle ? (
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden flex-1 flex flex-col">
              <div className="px-4 py-2.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-mono-tabular font-extrabold text-sm">
                    {selectedVehicle.plate}
                  </span>
                  <span className="text-xs text-blue-100 truncate">
                    {selectedVehicle.manufacturerModel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onEditVehicle(selectedVehicle)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editar</span>
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                {/* Photo + Quick Cycle */}
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file, selectedVehicle.id);
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCycleVehicle(-1)}
                          aria-label="Veículo anterior"
                          className="p-1.5 rounded-lg border border-slate-200 text-[#0B3C7D] hover:bg-slate-50 cursor-pointer shrink-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="relative flex-1 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewOpen(true)}
                            className="w-full h-full block cursor-pointer"
                            title="Ampliar foto"
                          >
                            <img
                              src={displayPhoto}
                              alt={`${selectedVehicle.manufacturerModel} (${selectedVehicle.plate})`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </button>
                          <div className="absolute right-2 bottom-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPhotoPreviewOpen(true)}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-2 py-1 text-[10px] font-semibold text-white cursor-pointer"
                            >
                              <Maximize2 className="w-3 h-3" />
                              Ampliar
                            </button>
                            {onUpdateVehiclePhoto && (
                              <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="inline-flex items-center gap-1 rounded-md bg-[#1565D8]/90 px-2 py-1 text-[10px] font-semibold text-white cursor-pointer"
                              >
                                <Camera className="w-3 h-3" />
                                Foto
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCycleVehicle(1)}
                          aria-label="Próximo veículo"
                          className="p-1.5 rounded-lg border border-slate-200 text-[#0B3C7D] hover:bg-slate-50 cursor-pointer shrink-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Essential Info Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="text-[11px] text-slate-500">Categoria / Setor</div>
                    <div className="font-semibold text-[#06295A] truncate mt-0.5">
                      {selectedVehicle.category} · {selectedVehicle.sector}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="text-[11px] text-slate-500">Km / Horímetro</div>
                    <div className="font-mono-tabular font-semibold text-[#06295A] mt-0.5">
                      {formatKmOrHours(selectedVehicle.kmOrHours, selectedVehicle.unit)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="text-[11px] text-slate-500">CRLV</div>
                    <div className="font-mono-tabular font-bold text-[#06295A] mt-0.5">
                      {selectedVehicle.expiryDates.crlv || 'Não informado'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="text-[11px] text-slate-500">ANTT / Cronotacógrafo</div>
                    <div className="font-mono-tabular font-bold text-[#06295A] truncate mt-0.5">
                      {selectedVehicle.expiryDates.antt || '—'} ·{' '}
                      {selectedVehicle.expiryDates.cronotacografo || '—'}
                    </div>
                  </div>
                </div>

                {/* Checklist & Evidence Progress Strip */}
                <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#06295A]">
                      Checklist ({selectedVehicleChecklistStats.done}/{selectedVehicleChecklistStats.total})
                    </span>
                    <span className="font-mono-tabular font-bold text-[#1565D8]">
                      {selectedVehicleChecklistStats.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1565D8] transition-all"
                      style={{ width: `${selectedVehicleChecklistStats.pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          selectedVehicleEvidence?.crlv &&
                          selectedVehicleEvidence?.cnt &&
                          selectedVehicleEvidence?.antt
                            ? 'text-emerald-600'
                            : 'text-amber-500'
                        }`}
                      />
                      Evidências:{' '}
                      {selectedVehicleEvidence
                        ? `${[
                            selectedVehicleEvidence.crlv ? 'CRLV' : null,
                            selectedVehicleEvidence.cnt ? 'CNT' : null,
                            selectedVehicleEvidence.antt ? 'ANTT' : null,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'Pendentes'}`
                        : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('checklists')}
                      className="font-semibold text-[#1565D8] hover:underline cursor-pointer"
                    >
                      Abrir checklist →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/90 p-8 text-center text-xs text-slate-500 flex-1 flex flex-col items-center justify-center gap-2">
              <Truck className="w-8 h-8 text-slate-300" />
              <p>Nenhum veículo cadastrado.</p>
              <button
                type="button"
                onClick={onAddVehicle}
                className="px-4 py-2 rounded-lg bg-[#0B3C7D] text-white text-xs font-semibold cursor-pointer"
              >
                Cadastrar Veículo
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Compact Sector & Category Quick Filter Chips */}
      <section className="rounded-2xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Setores:
          </span>
          {sectorSummary.map((s) => {
            const active = filters.sector === s.sector;
            return (
              <button
                key={s.sector}
                type="button"
                onClick={() => {
                  setPage(1);
                  onFiltersChange({ ...filters, sector: active ? 'Todos' : s.sector });
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0B3C7D] border-[#0B3C7D] text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span>{s.sector}</span>
                <span className="font-mono-tabular opacity-80">{s.count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Tipos:
          </span>
          {categorySummary
            .filter((c) => c.count > 0)
            .map((c) => {
              const active = filters.category === c.category;
              return (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    onFiltersChange({
                      ...filters,
                      category: active ? 'Todos' : c.category,
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1565D8] border-[#1565D8] text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className="font-mono-tabular opacity-80">{c.count}</span>
                </button>
              );
            })}
        </div>
      </section>

      {/* Photo Preview Modal */}
      {photoPreviewOpen && selectedVehicle && (
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
                src={resolveVehiclePhoto(
                  selectedVehicle.plate,
                  selectedVehicle.category,
                  selectedVehicle.photoUrl
                )}
                alt={`${selectedVehicle.manufacturerModel} (${selectedVehicle.plate})`}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
