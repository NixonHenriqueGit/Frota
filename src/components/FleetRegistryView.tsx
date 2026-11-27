import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Columns,
  Download,
  Edit3,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ChecklistKey, Sector, Vehicle, VehicleCategory, VehicleStatus } from '../types/fleet';
import { getChecklistItemsForCategory } from '../data/fleetSeed';
import {
  downloadCSV,
  formatCurrencyBRL,
  formatKmOrHours,
} from '../utils/formatters';
import { sanitizeFleetAgeYearMonths } from '../utils/fleetSpreadsheet';
import { VehicleStatusBadge } from './StatusBadges';

interface FleetRegistryViewProps {
  vehicles: Vehicle[];
  onAddVehicle: () => void;
  onImportPlanilha: () => void;
  onLoadDefaultFleet?: () => void;
  onClearAllFleet: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onToggleStatus: (vehicleId: string) => void;
  onInspectVehicle: (vehicleId: string) => void;
}

const BoolCell: React.FC<{ value: boolean; applicable?: boolean }> = ({
  value,
  applicable = true,
}) => {
  if (!applicable) {
    return <span className="text-[11px] font-medium text-slate-300">—</span>;
  }
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
      <Check className="w-3.5 h-3.5" />
      Sim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
      <X className="w-3.5 h-3.5" />
      Não
    </span>
  );
};

function isKeyApplicable(category: VehicleCategory, key: ChecklistKey): boolean {
  return getChecklistItemsForCategory(category).some((item) => item.key === key);
}

export const FleetRegistryView: React.FC<FleetRegistryViewProps> = ({
  vehicles,
  onAddVehicle,
  onImportPlanilha,
  onLoadDefaultFleet,
  onClearAllFleet,
  onEditVehicle,
  onDeleteVehicle,
  onToggleStatus,
  onInspectVehicle,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | VehicleCategory>('Todos');
  const [sectorFilter, setSectorFilter] = useState<'Todos' | Sector>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | VehicleStatus>('Todos');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (categoryFilter !== 'Todos' && v.category !== categoryFilter) return false;
      if (sectorFilter !== 'Todos' && v.sector !== sectorFilter) return false;
      if (statusFilter !== 'Todos' && v.status !== statusFilter) return false;
      if (q) {
        return (
          v.plate.toLowerCase().includes(q) ||
          v.manufacturerModel.toLowerCase().includes(q) ||
          v.fleetNumber.toLowerCase().includes(q) ||
          v.renavam.includes(q)
        );
      }
      return true;
    });
  }, [vehicles, search, categoryFilter, sectorFilter, statusFilter]);

  const handleExport = () => {
    downloadCSV(
      'frota_pau_brasil_cadastro_completo.csv',
      [
        'PLACA',
        'EMPRESA',
        'Nº FROTA',
        'COD.TIPO',
        'STATUS',
        'SETOR',
        'TIPO',
        'MODELO',
        'Nº EIXOS',
        'PRÓPRIO OU TERCEIRO',
        'FABRICANTE',
        'ANO FABRICAÇÃO',
        'ANO MODELO',
        'COR',
        'LOGOMARCA',
        'ANO OPERAÇÃO',
        'KM/HORAS ATUAL',
        'CARROCERIA',
        'TARA',
        'PBT',
        'RENAVAM',
        'CHASSIS',
        'VENCIMENTO CRLV',
        'VENCIMENTO IPVA',
        'VENCIMENTO ANTT',
        'VENCIMENTO CNT',
        'VENCIMENTO ALVARÁ VIGILÂNCIA SANITÁRIA',
        'VENCIMENTO EXTINTOR',
        'VENCIMENTO CRONOTACÓGRAFO',
        'Nº SÉRIE EXTINTOR',
        'VALOR TABELA FIPE (NOVO)',
        'VALOR ATUAL',
        'CAPACIDADE DO TANQUE COMB',
        'COMBUSTÍVEL',
        'CAPACIDADE (Pallets)',
        'CAPACIDADE CAIXAS / PESO',
        'STATUS2',
        'HB FROTA',
        'Macaco',
        'Chave de roda',
        'Cabo de força',
        'Pino cambão',
        'Triângulo',
        'Extintor',
        'Cone',
        'Tacógrafo',
        'Step',
        'Pneus',
        'Plataforma',
        'Estribo',
        'Kit Ergonômico',
        'Sensor de cinto',
        'IDADE FROTA EM ANOS',
        'PRAZO PARA TROCA EM ANOS',
        'PRAZO PARA TROCA EM KM/HORA',
        'MÊS / ANO PREVISTO PARA TROCA',
        'ANO COMPRA',
        'IDADE FROTA ANO / MESES',
        'COD. FIPE',
        'STATUS (TROCA)',
      ],
      filtered.map((v) => [
        v.plate,
        v.company,
        v.fleetNumber,
        v.typeCode,
        v.status,
        v.sector,
        v.category,
        v.model,
        v.axles,
        v.ownership,
        v.manufacturer,
        v.yearFab,
        v.yearMod,
        v.color,
        v.logoBrand,
        v.operationYear,
        `${v.kmOrHours} ${v.unit}`,
        v.bodywork,
        v.tare,
        v.pbt,
        v.renavam,
        v.chassi,
        v.expiryDates.crlv,
        v.expiryDates.ipva,
        v.expiryDates.antt,
        v.expiryDates.cnt,
        v.expiryDates.alvaraSanitario,
        v.expiryDates.extintor,
        v.expiryDates.cronotacografo,
        v.extinguisherSerial,
        v.fipeValue,
        v.currentValue,
        v.tankCapacity,
        v.fuelType,
        v.capacityPallets,
        v.cargoCapacity,
        v.status2,
        v.hbFrota ? 'Sim' : 'Não',
        isKeyApplicable(v.category, 'macaco') ? (v.checklist.macaco ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'chaveRoda') ? (v.checklist.chaveRoda ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'caboForca') ? (v.checklist.caboForca ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'pinoCambao') ? (v.checklist.pinoCambao ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'triangulo') ? (v.checklist.triangulo ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'extintor') ? (v.checklist.extintor ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'cones') ? (v.checklist.cones ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'tacografo') ? (v.checklist.tacografo ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'step') ? (v.checklist.step ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'pneus') ? (v.checklist.pneus ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'plataforma') ? (v.checklist.plataforma ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'estribo') ? (v.checklist.estribo ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'kitErgonomico') ? (v.checklist.kitErgonomico ? 'Sim' : 'Não') : 'N/A',
        isKeyApplicable(v.category, 'sensorCinto') ? (v.checklist.sensorCinto ? 'Sim' : 'Não') : 'N/A',
        v.fleetAgeYears,
        v.replacementTermYears,
        v.replacementTermKmHours,
        v.expectedReplacementMonthYear,
        v.purchaseYear,
        sanitizeFleetAgeYearMonths(v.fleetAgeYearMonths),
        v.fipeCode,
        v.finalStatus,
      ])
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa, nº frota, modelo ou Renavam..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0A2E5C] focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'Todos' | VehicleCategory)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#0A2E5C] focus:outline-none"
          >
            <option value="Todos">Todas Categorias</option>
            <option value="Caminhão">Caminhão</option>
            <option value="Carga Semi-Reboque">Carga Semi-Reboque</option>
            <option value="Empilhadeira">Empilhadeira</option>
            <option value="Frota Leve">Frota Leve</option>
            <option value="Tração Caminhão Trator">Tração Caminhão Trator</option>
          </select>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value as 'Todos' | Sector)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#0A2E5C] focus:outline-none"
          >
            <option value="Todos">Todos Setores</option>
            <option value="Distribuição">Distribuição</option>
            <option value="Vendas">Vendas</option>
            <option value="Puxada">Puxada</option>
            <option value="Armazém">Armazém</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | VehicleStatus)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#0A2E5C] focus:outline-none"
          >
            <option value="Todos">Todos Status</option>
            <option value="Ativo">Ativo</option>
            <option value="Parado">Parado</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={vehicles.length === 0}
            onClick={() => setConfirmClearAll(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100/80 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-red-700 cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            <span>Apagar Tudo</span>
          </button>
          <button
            type="button"
            onClick={onImportPlanilha}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0A2E5C]/30 bg-blue-50/70 hover:bg-blue-100/70 text-xs font-semibold text-[#0A2E5C] cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Planilha</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={onAddVehicle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Veículo</span>
          </button>
        </div>
      </div>

      {/* Full Spreadsheet Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0A2E5C] text-white flex-wrap gap-2">
          <h2 className="font-display text-sm font-bold">
            Cadastro da Frota ({filtered.length} veículos)
          </h2>
          <button
            type="button"
            onClick={() => setShowAllColumns((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{showAllColumns ? 'Visão Simplificada' : 'Ver Planilha Completa (60 col.)'}</span>
          </button>
        </div>

        {!showAllColumns ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3 whitespace-nowrap">Placa</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Nº Frota</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Modelo / Fabricante</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Categoria</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Setor</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Empresa</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Km/Horas</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">CRLV</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      Nenhum veículo cadastrado ainda. Clique em{' '}
                      <button
                        type="button"
                        onClick={onImportPlanilha}
                        className="text-[#0B63CE] font-semibold underline cursor-pointer"
                      >
                        Importar Planilha
                      </button>{' '}
                      ou em{' '}
                      <button
                        type="button"
                        onClick={onAddVehicle}
                        className="text-[#0A2E5C] font-semibold underline cursor-pointer"
                      >
                        Cadastrar Veículo
                      </button>
                      {onLoadDefaultFleet && vehicles.length === 0 && (
                        <>
                          {' '}
                          ou{' '}
                          <button
                            type="button"
                            onClick={onLoadDefaultFleet}
                            className="text-emerald-700 font-semibold underline cursor-pointer"
                          >
                            Carregar Frota Padrão
                          </button>
                        </>
                      )}
                      .
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectVehicle(v.id)}
                          className="font-mono-tabular font-bold text-[#0B63CE] hover:underline cursor-pointer"
                        >
                          {v.plate}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                        {v.fleetNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {v.manufacturerModel}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {v.category}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {v.sector}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {v.company}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                        {formatKmOrHours(v.kmOrHours, v.unit)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                        {v.expiryDates.crlv || '—'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <VehicleStatusBadge status={v.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleStatus(v.id)}
                            title={
                              v.status === 'Ativo' ? 'Marcar como Parado' : 'Ativar veículo'
                            }
                            className="p-1.5 rounded text-slate-500 hover:text-[#0A2E5C] hover:bg-slate-100 cursor-pointer"
                          >
                            {v.status === 'Ativo' ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-amber-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditVehicle(v)}
                            title="Editar veículo"
                            className="p-1.5 rounded text-slate-500 hover:text-[#0A2E5C] hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {confirmDeleteId === v.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteVehicle(v.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(v.id)}
                              title="Remover veículo"
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-max min-w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="sticky left-0 z-20 bg-slate-50 py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                  PLACA
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">EMPRESA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Nº FROTA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">COD.TIPO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">STATUS</th>
                <th className="py-2.5 px-3 whitespace-nowrap">SETOR</th>
                <th className="py-2.5 px-3 whitespace-nowrap">TIPO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">MODELO</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Nº EIXOS</th>
                <th className="py-2.5 px-3 whitespace-nowrap">PRÓPRIO OU TERCEIRO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">FABRICANTE</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">ANO FABRICAÇÃO</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">ANO MODELO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">COR</th>
                <th className="py-2.5 px-3 whitespace-nowrap">LOGOMARCA</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">ANO OPERAÇÃO</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">KM/HORAS ATUAL</th>
                <th className="py-2.5 px-3 whitespace-nowrap">CARROCERIA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">TARA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">PBT</th>
                <th className="py-2.5 px-3 whitespace-nowrap">RENAVAM</th>
                <th className="py-2.5 px-3 whitespace-nowrap">CHASSIS</th>
                <th className="py-2.5 px-3 whitespace-nowrap">VENCIMENTO CRLV</th>
                <th className="py-2.5 px-3 whitespace-nowrap">VENCIMENTO IPVA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">VENCIMENTO ANTT</th>
                <th className="py-2.5 px-3 whitespace-nowrap">VENCIMENTO CNT</th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  VENCIMENTO ALVARÁ VIGILÂNCIA SANITÁRIA
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">VENCIMENTO EXTINTOR</th>
                <th className="py-2.5 px-3 whitespace-nowrap">VENCIMENTO CRONOTACÓGRAFO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Nº SÉRIE EXTINTOR</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">
                  VALOR TABELA FIPE (NOVO)
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">VALOR ATUAL</th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  CAPACIDADE DO TANQUE COMB
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">COMBUSTÍVEL</th>
                <th className="py-2.5 px-3 whitespace-nowrap">CAPACIDADE (Pallets)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">CAPACIDADE CAIXAS / PESO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">STATUS2</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">HB FROTA</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Macaco</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Chave de roda</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Cabo de força</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Pino cambão</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Triângulo</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Extintor</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Cone</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Tacógrafo</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Step</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Pneus</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Plataforma</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Estribo</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Kit Ergonômico</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Sensor de cinto</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">
                  IDADE FROTA EM ANOS
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">
                  PRAZO PARA TROCA EM ANOS
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  PRAZO PARA TROCA EM KM/HORA
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  MÊS / ANO PREVISTO PARA TROCA
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">ANO COMPRA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">IDADE FROTA ANO / MESES</th>
                <th className="py-2.5 px-3 whitespace-nowrap">COD. FIPE</th>
                <th className="py-2.5 px-3 whitespace-nowrap">STATUS</th>
                <th className="sticky right-0 z-20 bg-slate-50 py-2.5 px-3 border-l border-slate-200 text-right whitespace-nowrap">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={61} className="py-12 text-center text-slate-500">
                    Nenhum veículo cadastrado ainda. Clique em{' '}
                    <button
                      type="button"
                      onClick={onImportPlanilha}
                      className="text-[#0B63CE] font-semibold underline cursor-pointer"
                    >
                      Importar Planilha
                    </button>{' '}
                    para carregar do Excel ou em{' '}
                    <button
                      type="button"
                      onClick={onAddVehicle}
                      className="text-[#0A2E5C] font-semibold underline cursor-pointer"
                    >
                      Cadastrar Veículo
                    </button>{' '}
                    para preencher manualmente
                    {onLoadDefaultFleet && vehicles.length === 0 && (
                      <>
                        {' '}
                        ou{' '}
                        <button
                          type="button"
                          onClick={onLoadDefaultFleet}
                          className="text-emerald-700 font-semibold underline cursor-pointer"
                        >
                          Carregar Frota Padrão
                        </button>
                      </>
                    )}
                    .
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectVehicle(v.id)}
                        className="font-mono-tabular font-bold text-[#0B63CE] hover:underline cursor-pointer"
                      >
                        {v.plate}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.company}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.fleetNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.typeCode}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <VehicleStatusBadge status={v.status} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.sector}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.category}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {v.model}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.axles}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.ownership}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.manufacturer}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.yearFab}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.yearMod}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.color}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.logoBrand}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.operationYear}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                      {formatKmOrHours(v.kmOrHours, v.unit)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.bodywork}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.tare}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.pbt}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.renavam}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.chassi}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.crlv}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.ipva}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.antt}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.cnt}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.alvaraSanitario}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.extintor}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expiryDates.cronotacografo}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.extinguisherSerial}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-800 whitespace-nowrap">
                      {formatCurrencyBRL(v.fipeValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-emerald-700 font-semibold whitespace-nowrap">
                      {formatCurrencyBRL(v.currentValue)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.tankCapacity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.fuelType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.capacityPallets}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.cargoCapacity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.status2}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.hbFrota} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.macaco} applicable={isKeyApplicable(v.category, 'macaco')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.chaveRoda} applicable={isKeyApplicable(v.category, 'chaveRoda')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.caboForca} applicable={isKeyApplicable(v.category, 'caboForca')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.pinoCambao} applicable={isKeyApplicable(v.category, 'pinoCambao')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.triangulo} applicable={isKeyApplicable(v.category, 'triangulo')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.extintor} applicable={isKeyApplicable(v.category, 'extintor')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.cones} applicable={isKeyApplicable(v.category, 'cones')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.tacografo} applicable={isKeyApplicable(v.category, 'tacografo')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.step} applicable={isKeyApplicable(v.category, 'step')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.pneus} applicable={isKeyApplicable(v.category, 'pneus')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.plataforma} applicable={isKeyApplicable(v.category, 'plataforma')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.estribo} applicable={isKeyApplicable(v.category, 'estribo')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.kitErgonomico} applicable={isKeyApplicable(v.category, 'kitErgonomico')} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <BoolCell value={v.checklist.sensorCinto} applicable={isKeyApplicable(v.category, 'sensorCinto')} />
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.fleetAgeYears}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.replacementTermYears}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.replacementTermKmHours}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.expectedReplacementMonthYear}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-center text-slate-700 whitespace-nowrap">
                      {v.purchaseYear}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {sanitizeFleetAgeYearMonths(v.fleetAgeYearMonths)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {v.fipeCode}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {v.finalStatus}
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 py-2.5 px-3 border-l border-slate-100 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(v.id)}
                          title={
                            v.status === 'Ativo' ? 'Marcar como Parado' : 'Ativar veículo'
                          }
                          className="p-1.5 rounded text-slate-500 hover:text-[#0A2E5C] hover:bg-slate-100 cursor-pointer"
                        >
                          {v.status === 'Ativo' ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-amber-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditVehicle(v)}
                          title="Editar veículo"
                          className="p-1.5 rounded text-slate-500 hover:text-[#0A2E5C] hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === v.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteVehicle(v.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(v.id)}
                            title="Remover veículo"
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Confirm Clear All Modal */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-red-600 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-display text-sm font-bold">
                  Apagar Todos os Cadastros
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                aria-label="Fechar"
                className="p-1 rounded hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs leading-relaxed text-slate-700">
                Tem certeza que deseja apagar todos os{' '}
                <strong className="text-slate-900">{vehicles.length} veículos</strong>{' '}
                cadastrados na frota, além de seus documentos, evidências e checklists
                associados? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllFleet();
                    setConfirmClearAll(false);
                    setConfirmDeleteId(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar e Apagar Tudo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
