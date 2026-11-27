import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  Database,
  Download,
  FilterX,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  StratifiedProblemCategory,
  StratifiedProblemCostCenter,
  StratifiedProblemCriticality,
  StratifiedProblemEquipment,
  StratifiedProblemMoment,
  StratifiedProblemRecord,
  Vehicle,
} from '../types/fleet';
import {
  EQUIPMENT_TO_COST_CENTER,
  OCCURRENCE_TYPE_OPTIONS,
  STRATIFIED_MONTHS,
  buildStratifiedProblemRecord,
  buildStratifiedResolutionRecord,
  collectStratifiedProblems,
  getCurrentShortMonth,
  inferEquipmentFromPlate,
} from '../data/problemStratification';

interface ProblemStratificationViewProps {
  vehicles: Vehicle[];
  blitzEntregaDocs: LegalizedDocumentRecord[];
  blitzPuxadaDocs: LegalizedDocumentRecord[];
  blitzEmpilhadeiraDocs: LegalizedDocumentRecord[];
  caminhoesDocs: LegalizedDocumentRecord[];
  puxadaCheckDocs: LegalizedDocumentRecord[];
  estratificacaoDocs: LegalizedDocumentRecord[];
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

interface ActiveFilters {
  month: StratifiedMonthShort | null;
  criticality: StratifiedProblemCriticality | null;
  moment: StratifiedProblemMoment | null;
  equipment: StratifiedProblemEquipment | null;
  costCenter: StratifiedProblemCostCenter | null;
  occurrenceType: string | null;
  plate: string | null;
  driver: string | null;
  category: StratifiedProblemCategory | null;
}

const EMPTY_FILTERS: ActiveFilters = {
  month: null,
  criticality: null,
  moment: null,
  equipment: null,
  costCenter: null,
  occurrenceType: null,
  plate: null,
  driver: null,
  category: null,
};

const EQUIPMENT_ORDER: StratifiedProblemEquipment[] = [
  'Caminhão',
  'Cavalo Mecânico',
  'Empilhadeira',
];

const COST_CENTER_ORDER: StratifiedProblemCostCenter[] = [
  'Entrega',
  'Puxada',
  'Armazém',
];

function countBy<T extends string>(
  items: StratifiedProblemRecord[],
  getter: (r: StratifiedProblemRecord) => T
): Array<{ key: T; count: number }> {
  const map = new Map<T, number>();
  for (const item of items) {
    const k = getter(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export const ProblemStratificationView: React.FC<
  ProblemStratificationViewProps
> = ({
  vehicles,
  blitzEntregaDocs,
  blitzPuxadaDocs,
  blitzEmpilhadeiraDocs,
  caminhoesDocs,
  puxadaCheckDocs,
  estratificacaoDocs,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [dataScope, setDataScope] = useState<'all' | 'checks'>('all');
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [notice, setNotice] = useState<string | null>(null);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState('');

  // Modal: + Nova Ocorrência
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formMonth, setFormMonth] = useState<StratifiedMonthShort>(() =>
    getCurrentShortMonth()
  );
  const [formDate, setFormDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [formPlate, setFormPlate] = useState('');
  const [formEquipment, setFormEquipment] =
    useState<StratifiedProblemEquipment>('Caminhão');
  const [formCostCenter, setFormCostCenter] =
    useState<StratifiedProblemCostCenter>('Entrega');
  const [formDriver, setFormDriver] = useState('');
  const [formOccurrenceType, setFormOccurrenceType] = useState<string>(
    OCCURRENCE_TYPE_OPTIONS[0]
  );
  const [formItemName, setFormItemName] = useState('');
  const [formCriticality, setFormCriticality] =
    useState<StratifiedProblemCriticality>('IMEDIATA');
  const [formMoment, setFormMoment] = useState<StratifiedProblemMoment>('Saída');
  const [formCategory, setFormCategory] =
    useState<StratifiedProblemCategory>('Segurança');
  const [formResolutionDays, setFormResolutionDays] = useState<string>('1');
  const [formDetails, setFormDetails] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const allRecords = useMemo(
    () =>
      collectStratifiedProblems({
        vehicles,
        blitzEntregaDocs,
        blitzPuxadaDocs,
        blitzEmpilhadeiraDocs,
        caminhoesDocs,
        puxadaCheckDocs,
        estratificacaoDocs,
        includeHistoricalBase: dataScope === 'all',
      }),
    [
      vehicles,
      blitzEntregaDocs,
      blitzPuxadaDocs,
      blitzEmpilhadeiraDocs,
      caminhoesDocs,
      puxadaCheckDocs,
      estratificacaoDocs,
      dataScope,
    ]
  );

  const liveChecksCount = useMemo(
    () =>
      collectStratifiedProblems({
        vehicles,
        blitzEntregaDocs,
        blitzPuxadaDocs,
        blitzEmpilhadeiraDocs,
        caminhoesDocs,
        puxadaCheckDocs,
        estratificacaoDocs,
        includeHistoricalBase: false,
      }).length,
    [
      vehicles,
      blitzEntregaDocs,
      blitzPuxadaDocs,
      blitzEmpilhadeiraDocs,
      caminhoesDocs,
      puxadaCheckDocs,
      estratificacaoDocs,
    ]
  );

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      if (filters.month && r.month !== filters.month) return false;
      if (filters.criticality && r.criticality !== filters.criticality) return false;
      if (filters.moment && r.moment !== filters.moment) return false;
      if (filters.equipment && r.equipment !== filters.equipment) return false;
      if (filters.costCenter && r.costCenter !== filters.costCenter) return false;
      if (filters.occurrenceType && r.occurrenceType !== filters.occurrenceType) {
        return false;
      }
      if (filters.plate && r.plate !== filters.plate) return false;
      if (filters.driver && r.driverOrOperator !== filters.driver) return false;
      if (filters.category && r.category !== filters.category) return false;
      return true;
    });
  }, [allRecords, filters]);

  const activeFilterTags = useMemo(() => {
    const tags: Array<{ key: keyof ActiveFilters; label: string }> = [];
    if (filters.month) tags.push({ key: 'month', label: `Mês: ${filters.month}` });
    if (filters.criticality) {
      tags.push({ key: 'criticality', label: `Criticidade: ${filters.criticality}` });
    }
    if (filters.moment) tags.push({ key: 'moment', label: filters.moment });
    if (filters.equipment) tags.push({ key: 'equipment', label: filters.equipment });
    if (filters.costCenter) tags.push({ key: 'costCenter', label: filters.costCenter });
    if (filters.occurrenceType) {
      tags.push({ key: 'occurrenceType', label: filters.occurrenceType });
    }
    if (filters.plate) tags.push({ key: 'plate', label: `Veículo: ${filters.plate}` });
    if (filters.driver) tags.push({ key: 'driver', label: filters.driver });
    if (filters.category) tags.push({ key: 'category', label: filters.category });
    return tags;
  }, [filters]);

  const toggleFilter = <K extends keyof ActiveFilters>(
    key: K,
    value: NonNullable<ActiveFilters[K]>
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) {
      return {
        total: 0,
        safetyPct: 0,
        immediatePct: 0,
        avgDays: 0,
        withinOneDayPct: 0,
        detectedOnExit: 0,
      };
    }

    let safetyCount = 0;
    let immediateCount = 0;
    let totalDays = 0;
    let withinOneDayCount = 0;
    let exitCount = 0;

    for (const r of filteredRecords) {
      if (r.category === 'Segurança') safetyCount += 1;
      if (r.criticality === 'IMEDIATA') immediateCount += 1;
      totalDays += r.resolutionDays;
      if (r.resolutionDays <= 1) withinOneDayCount += 1;
      if (r.moment === 'Saída') exitCount += 1;
    }

    return {
      total,
      safetyPct: Math.round((safetyCount / total) * 100),
      immediatePct: Math.round((immediateCount / total) * 100),
      avgDays: totalDays / total,
      withinOneDayPct: Math.round((withinOneDayCount / total) * 100),
      detectedOnExit: exitCount,
    };
  }, [filteredRecords]);

  // Monthly distribution
  const monthlySeries = useMemo(() => {
    const counts = new Map<StratifiedMonthShort, number>();
    for (const r of filteredRecords) {
      counts.set(r.month, (counts.get(r.month) ?? 0) + 1);
    }
    const hasLateMonths = allRecords.some(
      (r) =>
        r.month === 'SET' ||
        r.month === 'OUT' ||
        r.month === 'NOV' ||
        r.month === 'DEZ'
    );
    const visibleMonths = hasLateMonths
      ? STRATIFIED_MONTHS
      : STRATIFIED_MONTHS.slice(0, 8);

    const list = visibleMonths.map((month) => ({
      month,
      count: counts.get(month) ?? 0,
    }));
    const max = list.reduce((acc, m) => Math.max(acc, m.count), 1);
    return { list, max };
  }, [filteredRecords, allRecords]);

  // Criticality & Moment breakdown
  const criticalityStats = useMemo(() => {
    const total = filteredRecords.length || 1;
    const imediata = filteredRecords.filter(
      (r) => r.criticality === 'IMEDIATA'
    ).length;
    const alta = filteredRecords.filter((r) => r.criticality === 'ALTA').length;
    const media = filteredRecords.filter((r) => r.criticality === 'MÉDIA').length;
    const countTotal = filteredRecords.length;

    return {
      countTotal,
      items: [
        {
          key: 'IMEDIATA' as const,
          label: 'IMEDIATA',
          count: imediata,
          pct: countTotal ? Math.round((imediata / total) * 100) : 0,
          barClass: 'bg-[#EF4444] hover:bg-[#DC2626]',
          dotClass: 'bg-[#EF4444]',
        },
        {
          key: 'ALTA' as const,
          label: 'ALTA',
          count: alta,
          pct: countTotal ? Math.round((alta / total) * 100) : 0,
          barClass: 'bg-[#F59E0B] hover:bg-[#D97706]',
          dotClass: 'bg-[#F59E0B]',
        },
        {
          key: 'MÉDIA' as const,
          label: 'MÉDIA',
          count: media,
          pct: countTotal ? Math.round((media / total) * 100) : 0,
          barClass: 'bg-[#EAB308] hover:bg-[#CA8A04]',
          dotClass: 'bg-[#EAB308]',
        },
      ],
    };
  }, [filteredRecords]);

  const momentStats = useMemo(() => {
    const total = filteredRecords.length || 1;
    const saida = filteredRecords.filter((r) => r.moment === 'Saída').length;
    const retorno = filteredRecords.filter((r) => r.moment === 'Retorno').length;
    const countTotal = filteredRecords.length;

    return {
      countTotal,
      items: [
        {
          key: 'Saída' as const,
          label: 'Saída',
          count: saida,
          pct: countTotal ? Math.round((saida / total) * 100) : 0,
          barClass: 'bg-[#2563EB] hover:bg-[#1D4ED8]',
          dotClass: 'bg-[#2563EB]',
        },
        {
          key: 'Retorno' as const,
          label: 'Retorno',
          count: retorno,
          pct: countTotal ? Math.round((retorno / total) * 100) : 0,
          barClass: 'bg-[#10B981] hover:bg-[#059669]',
          dotClass: 'bg-[#10B981]',
        },
      ],
    };
  }, [filteredRecords]);

  const equipmentSeries = useMemo(() => {
    const map = new Map<StratifiedProblemEquipment, number>();
    for (const eq of EQUIPMENT_ORDER) map.set(eq, 0);
    for (const r of filteredRecords) {
      map.set(r.equipment, (map.get(r.equipment) ?? 0) + 1);
    }
    const list = EQUIPMENT_ORDER.map((key) => ({ key, count: map.get(key) ?? 0 }));
    const max = list.reduce((acc, i) => Math.max(acc, i.count), 1);
    return { list, max };
  }, [filteredRecords]);

  const costCenterSeries = useMemo(() => {
    const map = new Map<StratifiedProblemCostCenter, number>();
    for (const cc of COST_CENTER_ORDER) map.set(cc, 0);
    for (const r of filteredRecords) {
      map.set(r.costCenter, (map.get(r.costCenter) ?? 0) + 1);
    }
    const list = COST_CENTER_ORDER.map((key) => ({ key, count: map.get(key) ?? 0 }));
    const max = list.reduce((acc, i) => Math.max(acc, i.count), 1);
    return { list, max };
  }, [filteredRecords]);

  const occurrenceRanking = useMemo(() => {
    const list = countBy(filteredRecords, (r) => r.occurrenceType).slice(0, 10);
    const max = list.reduce((acc, i) => Math.max(acc, i.count), 1);
    return { list, max };
  }, [filteredRecords]);

  const vehicleRanking = useMemo(() => {
    const list = countBy(filteredRecords, (r) => r.plate).slice(0, 8);
    const max = list.reduce((acc, i) => Math.max(acc, i.count), 1);
    return { list, max };
  }, [filteredRecords]);

  const driverRanking = useMemo(() => {
    const list = countBy(filteredRecords, (r) => r.driverOrOperator).slice(0, 8);
    const max = list.reduce((acc, i) => Math.max(acc, i.count), 1);
    return { list, max };
  }, [filteredRecords]);

  const uniquePlateSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) if (v.plate) set.add(v.plate.toUpperCase());
    for (const r of allRecords) if (r.plate) set.add(r.plate.toUpperCase());
    return Array.from(set).sort();
  }, [vehicles, allRecords]);

  const modalFilteredRecords = useMemo(() => {
    const q = recordsSearch.trim().toLowerCase();
    if (!q) return filteredRecords;
    return filteredRecords.filter(
      (r) =>
        r.plate.toLowerCase().includes(q) ||
        r.driverOrOperator.toLowerCase().includes(q) ||
        r.occurrenceType.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.sourceLabel.toLowerCase().includes(q) ||
        r.equipment.toLowerCase().includes(q) ||
        r.costCenter.toLowerCase().includes(q) ||
        r.month.toLowerCase().includes(q)
    );
  }, [filteredRecords, recordsSearch]);

  const handleSaveResolutionOverride = (
    item: StratifiedProblemRecord,
    patch: { resolved: boolean; resolutionDays: number; moment?: StratifiedProblemMoment }
  ) => {
    const built = buildStratifiedResolutionRecord({
      targetId: item.id,
      resolved: patch.resolved,
      resolutionDays: patch.resolutionDays,
      moment: patch.moment ?? item.moment,
    });
    const existing = estratificacaoDocs.find((d) => d.id === built.id);
    if (existing) {
      onUpdateRecord(existing.id, {
        fileName: built.fileName,
        fileSize: built.fileSize,
        expiryDate: built.expiryDate,
        referenceDate: built.referenceDate,
        notes: built.notes,
        fileDataUrl: built.fileDataUrl,
      });
    } else {
      onAddRecords([built]);
    }
    showNotice(
      patch.resolved
        ? `Ocorrência de ${item.plate} marcada como resolvida (${patch.resolutionDays} d).`
        : `Tratativa de ${item.plate} atualizada.`
    );
  };

  const handleOpenAddModal = () => {
    const defaultPlate = uniquePlateSuggestions[0] ?? 'RLT5J44';
    const inferredEq = inferEquipmentFromPlate(defaultPlate, vehicles, 'Caminhão');
    setFormMonth(getCurrentShortMonth());
    setFormDate(new Date().toLocaleDateString('pt-BR'));
    setFormPlate(defaultPlate);
    setFormEquipment(inferredEq);
    setFormCostCenter(EQUIPMENT_TO_COST_CENTER[inferredEq]);
    setFormDriver('');
    setFormOccurrenceType(OCCURRENCE_TYPE_OPTIONS[0]);
    setFormItemName('');
    setFormCriticality('IMEDIATA');
    setFormMoment('Saída');
    setFormCategory('Segurança');
    setFormResolutionDays('1');
    setFormDetails('');
    setAddModalOpen(true);
  };

  const handleSaveOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = formPlate.trim().toUpperCase();
    if (!cleanPlate) {
      showNotice('Informe a placa ou código do equipamento.');
      return;
    }

    const parsedDays = Math.max(
      0,
      Number(formResolutionDays.replace(',', '.')) || 0
    );

    const record = buildStratifiedProblemRecord({
      month: formMonth,
      date: formDate.trim() || new Date().toLocaleDateString('pt-BR'),
      plate: cleanPlate,
      equipment: formEquipment,
      costCenter: formCostCenter,
      driverOrOperator: formDriver.trim() || 'Não informado',
      occurrenceType: formOccurrenceType,
      itemName: formItemName.trim() || formOccurrenceType,
      category: formCategory,
      criticality: formCriticality,
      moment: formMoment,
      resolutionDays: parsedDays,
      resolved: true,
      details:
        formDetails.trim() ||
        `Ocorrência de ${formOccurrenceType} identificada na ${formMoment.toLowerCase()}.`,
    });

    onAddRecords([record]);
    setAddModalOpen(false);
    showNotice(`Ocorrência registrada em ${cleanPlate} (${formOccurrenceType}).`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredRecords.map((r) => ({
      ORIGEM: r.sourceLabel,
      MÊS: r.month,
      DATA: r.date,
      VEÍCULO: r.plate,
      EQUIPAMENTO: r.equipment,
      'CENTRO DE CUSTO': r.costCenter,
      'MOTORISTA / OPERADOR': r.driverOrOperator,
      'TIPO DE OCORRÊNCIA': r.occurrenceType,
      'ITEM REPROVADO': r.itemName,
      CATEGORIA: r.category,
      CRITICIDADE: r.criticality,
      MOMENTO: r.moment,
      'PRAZO (DIAS)': r.resolutionDays,
      STATUS: r.resolved ? 'Resolvida' : 'Em aberto',
      DETALHES: r.details,
    }));
    const ws = XLSX.utils.json_to_sheet(
      rows.length > 0
        ? rows
        : [{ MENSAGEM: 'Sem ocorrências para o filtro selecionado' }]
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Estratificação 1.3.3.4');
    XLSX.writeFile(wb, '1.3.3.4_Estratificacao_dos_Problemas.xlsx');
    showNotice('Planilha exportada com sucesso.');
  };

  return (
    <div className="flex-1 flex flex-col gap-3.5 py-0.5">
      {/* Compact Corporate Navy Header */}
      <section className="rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white px-5 py-3.5 shadow-[0_6px_18px_rgba(11,60,125,0.18)] flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.66rem] font-bold uppercase tracking-wider text-blue-200/90">
            1.3 CHECK LIST DA FROTA · BLITZ + CHECKS MENSAIS INTEGRADOS
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold tracking-[0.015em] [word-spacing:0.12em]">
            1.3.3.4 ESTRATIFICAÇÃO DOS PROBLEMAS
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Source Scope Switch: Junção Checks vs Base Completa */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg bg-[#051D43]/70 border border-white/20"
            role="group"
            aria-label="Origem dos dados"
          >
            <button
              type="button"
              onClick={() => setDataScope('all')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                dataScope === 'all'
                  ? 'bg-white text-[#06295A] shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Checks + Base ({liveChecksCount + 47})
            </button>
            <button
              type="button"
              onClick={() => setDataScope('checks')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                dataScope === 'checks'
                  ? 'bg-white text-[#06295A] shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Somente Checks ({liveChecksCount})
            </button>
          </div>

          {activeFilterTags.length > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/50 text-amber-100 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Limpar ({activeFilterTags.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setRecordsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Registros ({filteredRecords.length})</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-blue-50 text-[#06295A] text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Ocorrência</span>
          </button>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
            className="p-0.5 text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active filter strip */}
      {activeFilterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
            Filtros ativos:
          </span>
          {activeFilterTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  [tag.key]: null,
                }))
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EAF2FD] border border-[#0B3C7D]/30 text-[#06295A] text-xs font-bold hover:bg-[#DCE9FC] cursor-pointer"
            >
              <span>{tag.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* ROW 1: 6 KPI Cards */}
      <section
        aria-label="Indicadores principais de ocorrências"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="text-left rounded-xl bg-white border border-slate-200/90 hover:border-[#1565D8]/50 px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all cursor-pointer"
        >
          <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
            {kpis.total}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Ocorrências
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('category', 'Segurança')}
          className={`text-left rounded-xl border px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all cursor-pointer ${
            filters.category === 'Segurança'
              ? 'bg-[#EAF2FD] border-[#0B3C7D] ring-1 ring-[#0B3C7D]/30'
              : 'bg-white border-slate-200/90 hover:border-[#1565D8]/50'
          }`}
        >
          <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
            {kpis.safetyPct}%
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Segurança
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('criticality', 'IMEDIATA')}
          className={`text-left rounded-xl border px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all cursor-pointer ${
            filters.criticality === 'IMEDIATA'
              ? 'bg-red-50 border-red-400 ring-1 ring-red-200'
              : 'bg-white border-slate-200/90 hover:border-[#1565D8]/50'
          }`}
        >
          <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
            {kpis.immediatePct}%
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Criticidade imediata
          </div>
        </button>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
            {kpis.avgDays.toFixed(1)} d
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Prazo médio
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
            {kpis.withinOneDayPct}%
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Resolvidas em até 1 dia
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleFilter('moment', 'Saída')}
          className={`text-left rounded-xl border px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all cursor-pointer ${
            filters.moment === 'Saída'
              ? 'bg-[#EAF2FD] border-[#0B3C7D] ring-1 ring-[#0B3C7D]/30'
              : 'bg-white border-slate-200/90 hover:border-[#1565D8]/50'
          }`}
        >
          <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
            {kpis.detectedOnExit}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Detectadas na saída
          </div>
        </button>
      </section>

      {/* ROW 2: 3 Analytical Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Card 1: OCORRÊNCIAS POR MÊS */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
            OCORRÊNCIAS POR MÊS
          </h3>

          <div className="mt-4 h-44 flex items-end justify-between gap-2 px-1 pt-5">
            {monthlySeries.list.map((m) => {
              const heightPct =
                m.count > 0
                  ? Math.max(12, Math.round((m.count / monthlySeries.max) * 100))
                  : 0;
              const isSelected = filters.month === m.month;
              const isDimmed = filters.month !== null && !isSelected;

              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => toggleFilter('month', m.month)}
                  title={`${m.month}: ${m.count} ocorrências`}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1 group cursor-pointer"
                >
                  <span
                    className={`text-[11px] font-mono tabular-nums font-bold transition-opacity ${
                      isDimmed ? 'text-slate-400' : 'text-[#06295A]'
                    }`}
                  >
                    {m.count}
                  </span>
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[34px] rounded-t-md transition-all ${
                        isSelected
                          ? 'bg-[#06295A] ring-2 ring-[#1565D8]/40'
                          : isDimmed
                          ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                          : 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-wide mt-0.5 ${
                      isSelected ? 'text-[#06295A]' : 'text-slate-500'
                    }`}
                  >
                    {m.month}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: CRITICIDADE + SAÍDA X RETORNO */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">
              CRITICIDADE
            </h3>
            <div className="h-7 w-full rounded-md overflow-hidden flex bg-slate-100">
              {criticalityStats.items.map((item) => {
                if (item.count === 0) return null;
                const widthPct =
                  (item.count / Math.max(1, criticalityStats.countTotal)) * 100;
                const isSelected = filters.criticality === item.key;
                const isDimmed = filters.criticality !== null && !isSelected;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleFilter('criticality', item.key)}
                    title={`${item.label}: ${item.count} (${item.pct}%)`}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full transition-all cursor-pointer ${item.barClass} ${
                      isDimmed ? 'opacity-35' : ''
                    } ${isSelected ? 'ring-2 ring-inset ring-slate-900/30' : ''}`}
                  />
                );
              })}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {criticalityStats.items.map((item) => {
                const isSelected = filters.criticality === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleFilter('criticality', item.key)}
                    className={`inline-flex items-center gap-1.5 text-xs cursor-pointer transition-opacity ${
                      filters.criticality && !isSelected
                        ? 'opacity-45'
                        : 'opacity-100'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${item.dotClass}`}
                    />
                    <span className="font-semibold text-slate-700 font-mono tabular-nums">
                      {item.label}: {item.count} ({item.pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">
              SAÍDA X RETORNO
            </h3>
            <div className="h-7 w-full rounded-md overflow-hidden flex bg-slate-100">
              {momentStats.items.map((item) => {
                if (item.count === 0) return null;
                const widthPct =
                  (item.count / Math.max(1, momentStats.countTotal)) * 100;
                const isSelected = filters.moment === item.key;
                const isDimmed = filters.moment !== null && !isSelected;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleFilter('moment', item.key)}
                    title={`${item.label}: ${item.count} (${item.pct}%)`}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full transition-all cursor-pointer ${item.barClass} ${
                      isDimmed ? 'opacity-35' : ''
                    } ${isSelected ? 'ring-2 ring-inset ring-slate-900/30' : ''}`}
                  />
                );
              })}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {momentStats.items.map((item) => {
                const isSelected = filters.moment === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleFilter('moment', item.key)}
                    className={`inline-flex items-center gap-1.5 text-xs cursor-pointer transition-opacity ${
                      filters.moment && !isSelected ? 'opacity-45' : 'opacity-100'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${item.dotClass}`}
                    />
                    <span className="font-semibold text-slate-700 font-mono tabular-nums">
                      {item.label}: {item.count} ({item.pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: POR EQUIPAMENTO + POR CENTRO DE CUSTO */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2.5">
              POR EQUIPAMENTO
            </h3>
            <div className="space-y-2">
              {equipmentSeries.list.map((row) => {
                const widthPct =
                  row.count > 0
                    ? Math.max(6, Math.round((row.count / equipmentSeries.max) * 100))
                    : 0;
                const isSelected = filters.equipment === row.key;
                const isDimmed = filters.equipment !== null && !isSelected;

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleFilter('equipment', row.key)}
                    className="w-full flex items-center gap-2.5 group cursor-pointer text-left"
                  >
                    <span
                      className={`w-32 shrink-0 text-xs truncate ${
                        isSelected
                          ? 'font-extrabold text-[#06295A]'
                          : 'font-medium text-slate-600 group-hover:text-[#06295A]'
                      }`}
                    >
                      {row.key}
                    </span>
                    <div className="flex-1 h-4 flex items-center">
                      {widthPct > 0 && (
                        <div
                          className={`h-full rounded-[4px] transition-all ${
                            isSelected
                              ? 'bg-[#06295A]'
                              : isDimmed
                              ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                              : 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      )}
                    </div>
                    <span className="w-7 text-right font-mono tabular-nums text-xs font-extrabold text-[#06295A] shrink-0">
                      {row.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2.5">
              POR CENTRO DE CUSTO
            </h3>
            <div className="space-y-2">
              {costCenterSeries.list.map((row) => {
                const widthPct =
                  row.count > 0
                    ? Math.max(6, Math.round((row.count / costCenterSeries.max) * 100))
                    : 0;
                const isSelected = filters.costCenter === row.key;
                const isDimmed = filters.costCenter !== null && !isSelected;

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleFilter('costCenter', row.key)}
                    className="w-full flex items-center gap-2.5 group cursor-pointer text-left"
                  >
                    <span
                      className={`w-32 shrink-0 text-xs truncate ${
                        isSelected
                          ? 'font-extrabold text-[#06295A]'
                          : 'font-medium text-slate-600 group-hover:text-[#06295A]'
                      }`}
                    >
                      {row.key}
                    </span>
                    <div className="flex-1 h-4 flex items-center">
                      {widthPct > 0 && (
                        <div
                          className={`h-full rounded-[4px] transition-all ${
                            isSelected
                              ? 'bg-[#06295A]'
                              : isDimmed
                              ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                              : 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      )}
                    </div>
                    <span className="w-7 text-right font-mono tabular-nums text-xs font-extrabold text-[#06295A] shrink-0">
                      {row.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ROW 3: 3 Ranking Panels */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">
            TIPO DE OCORRÊNCIA
          </h3>
          {occurrenceRanking.list.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Sem registros para o filtro atual.
            </div>
          ) : (
            <div className="space-y-2.5">
              {occurrenceRanking.list.map((row) => {
                const widthPct = Math.max(
                  6,
                  Math.round((row.count / occurrenceRanking.max) * 100)
                );
                const isSelected = filters.occurrenceType === row.key;
                const isDimmed = filters.occurrenceType !== null && !isSelected;

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleFilter('occurrenceType', row.key)}
                    className="w-full flex items-center gap-2.5 group cursor-pointer text-left"
                  >
                    <span
                      className={`w-28 shrink-0 text-xs truncate ${
                        isSelected
                          ? 'font-extrabold text-[#06295A]'
                          : 'font-medium text-slate-600 group-hover:text-[#06295A]'
                      }`}
                    >
                      {row.key}
                    </span>
                    <div className="flex-1 h-4 flex items-center">
                      <div
                        className={`h-full rounded-[4px] transition-all ${
                          isSelected
                            ? 'bg-[#06295A]'
                            : isDimmed
                            ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                            : 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right font-mono tabular-nums text-xs font-extrabold text-[#06295A] shrink-0">
                      {row.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">
            VEÍCULOS COM MAIS OCORRÊNCIAS
          </h3>
          {vehicleRanking.list.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Sem registros para o filtro atual.
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleRanking.list.map((row) => {
                const widthPct = Math.max(
                  8,
                  Math.round((row.count / vehicleRanking.max) * 100)
                );
                const isSelected = filters.plate === row.key;
                const isDimmed = filters.plate !== null && !isSelected;

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleFilter('plate', row.key)}
                    className="w-full flex items-center gap-2.5 group cursor-pointer text-left"
                  >
                    <span
                      className={`w-24 shrink-0 text-xs font-mono tabular-nums truncate ${
                        isSelected
                          ? 'font-extrabold text-[#06295A]'
                          : 'font-semibold text-slate-700 group-hover:text-[#06295A]'
                      }`}
                    >
                      {row.key}
                    </span>
                    <div className="flex-1 h-4 flex items-center">
                      <div
                        className={`h-full rounded-[4px] transition-all ${
                          isSelected
                            ? 'bg-[#06295A]'
                            : isDimmed
                            ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                            : 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right font-mono tabular-nums text-xs font-extrabold text-[#06295A] shrink-0">
                      {row.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">
            MOTORISTAS/OPERADORES
          </h3>
          {driverRanking.list.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Sem registros para o filtro atual.
            </div>
          ) : (
            <div className="space-y-3">
              {driverRanking.list.map((row) => {
                const widthPct = Math.max(
                  8,
                  Math.round((row.count / driverRanking.max) * 100)
                );
                const isSelected = filters.driver === row.key;
                const isDimmed = filters.driver !== null && !isSelected;

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleFilter('driver', row.key)}
                    className="w-full flex items-center gap-2.5 group cursor-pointer text-left"
                  >
                    <span
                      className={`w-32 shrink-0 text-xs truncate ${
                        isSelected
                          ? 'font-extrabold text-[#06295A]'
                          : 'font-medium text-slate-600 group-hover:text-[#06295A]'
                      }`}
                    >
                      {row.key}
                    </span>
                    <div className="flex-1 h-4 flex items-center">
                      <div
                        className={`h-full rounded-[4px] transition-all ${
                          isSelected
                            ? 'bg-[#06295A]'
                            : isDimmed
                            ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                            : 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right font-mono tabular-nums text-xs font-extrabold text-[#06295A] shrink-0">
                      {row.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Modal: Base Analítica + Tratativa/Resolução */}
      {recordsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="records-base-modal-title"
        >
          <div className="w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] to-[#1565D8] text-white flex items-center justify-between gap-3">
              <div>
                <h3
                  id="records-base-modal-title"
                  className="font-display text-sm font-bold tracking-wide"
                >
                  Base Analítica Integrada — 1.3.3.4 ({modalFilteredRecords.length})
                </h3>
                <p className="text-[11px] text-blue-100/85">
                  Reúne os NOKs da Blitz e dos Checks Mensais com controle de Saída/Retorno e baixa do prazo de resolução.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecordsModalOpen(false)}
                aria-label="Fechar base"
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={recordsSearch}
                  onChange={(e) => setRecordsSearch(e.target.value)}
                  placeholder="Buscar placa, origem, item, motorista..."
                  className="w-full h-9 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                />
                {recordsSearch && (
                  <button
                    type="button"
                    onClick={() => setRecordsSearch('')}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setRecordsModalOpen(false);
                  handleOpenAddModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Ocorrência</span>
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Origem · Mês</th>
                    <th className="py-2.5 px-3">Veículo</th>
                    <th className="py-2.5 px-3">Equipamento · CC</th>
                    <th className="py-2.5 px-3">Motorista / Operador</th>
                    <th className="py-2.5 px-3">Ocorrência · Item</th>
                    <th className="py-2.5 px-3">Criticidade</th>
                    <th className="py-2.5 px-3">Momento</th>
                    <th className="py-2.5 px-3 text-right">Prazo / Baixa</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {modalFilteredRecords.map((r) => {
                    const canResolveOverride =
                      r.sourceKind === 'blitz' || r.sourceKind === 'mensal';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-semibold text-[#06295A]">
                            {r.sourceLabel}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500">
                            {r.month} · {r.date}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono tabular-nums font-extrabold text-[#06295A]">
                          {r.plate}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {r.equipment} ·{' '}
                          <span className="text-slate-500">{r.costCenter}</span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {r.driverOrOperator}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800">
                            {r.occurrenceType}
                          </div>
                          {r.itemName !== r.occurrenceType && (
                            <div className="text-[11px] text-slate-500 max-w-xs truncate">
                              {r.itemName}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.criticality === 'IMEDIATA'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : r.criticality === 'ALTA'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                            }`}
                          >
                            {r.criticality}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {canResolveOverride ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveResolutionOverride(r, {
                                  resolved: r.resolved,
                                  resolutionDays: r.resolutionDays,
                                  moment: r.moment === 'Saída' ? 'Retorno' : 'Saída',
                                })
                              }
                              title="Clique para alternar Saída / Retorno"
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                                r.moment === 'Saída'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {r.moment}
                            </button>
                          ) : (
                            <span className="text-slate-700">{r.moment}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right">
                          {canResolveOverride ? (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={60}
                                value={r.resolutionDays}
                                onChange={(e) => {
                                  const days = Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  );
                                  handleSaveResolutionOverride(r, {
                                    resolved: r.resolved,
                                    resolutionDays: days,
                                  });
                                }}
                                aria-label="Prazo em dias"
                                className="w-12 h-7 px-1.5 rounded border border-slate-200 text-right font-mono tabular-nums text-xs text-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveResolutionOverride(r, {
                                    resolved: !r.resolved,
                                    resolutionDays: !r.resolved ? Math.min(r.resolutionDays, 1) : r.resolutionDays,
                                  })
                                }
                                className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                  r.resolved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                {r.resolved ? 'Resolvida' : 'Resolver'}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono tabular-nums text-slate-700">
                              {r.resolutionDays} d
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right">
                          {r.isEditable ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRecord(r.id);
                                showNotice(`Registro de ${r.plate} removido.`);
                              }}
                              aria-label="Excluir ocorrência"
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {r.sourceKind === 'seed' ? 'Base' : 'Check'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nova Ocorrência */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-strat-problem-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] to-[#1565D8] text-white flex items-center justify-between gap-3">
              <div>
                <h3
                  id="add-strat-problem-title"
                  className="font-display text-sm font-bold tracking-wide"
                >
                  Registrar Ocorrência — 1.3.3.4 Estratificação
                </h3>
                <p className="text-[11px] text-blue-100/85">
                  Os indicadores e gráficos do painel são atualizados automaticamente ao salvar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                aria-label="Fechar modal"
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOccurrence} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Veículo / Placa
                  </label>
                  <input
                    type="text"
                    list="strat-plate-suggestions"
                    value={formPlate}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormPlate(val);
                      const eq = inferEquipmentFromPlate(val, vehicles, formEquipment);
                      setFormEquipment(eq);
                      setFormCostCenter(EQUIPMENT_TO_COST_CENTER[eq]);
                    }}
                    placeholder="Ex.: RLT5J44"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono font-bold text-[#06295A] focus:outline-none focus:border-[#0B3C7D]"
                    required
                  />
                  <datalist id="strat-plate-suggestions">
                    {uniquePlateSuggestions.map((pl) => (
                      <option key={pl} value={pl} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Equipamento
                  </label>
                  <select
                    value={formEquipment}
                    onChange={(e) => {
                      const eq = e.target.value as StratifiedProblemEquipment;
                      setFormEquipment(eq);
                      setFormCostCenter(EQUIPMENT_TO_COST_CENTER[eq]);
                    }}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    {EQUIPMENT_ORDER.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Centro de Custo
                  </label>
                  <select
                    value={formCostCenter}
                    onChange={(e) =>
                      setFormCostCenter(e.target.value as StratifiedProblemCostCenter)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    {COST_CENTER_ORDER.map((cc) => (
                      <option key={cc} value={cc}>
                        {cc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Motorista / Operador
                  </label>
                  <input
                    type="text"
                    value={formDriver}
                    onChange={(e) => setFormDriver(e.target.value)}
                    placeholder="Ex.: Jefferson Jones"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tipo de Ocorrência
                  </label>
                  <select
                    value={formOccurrenceType}
                    onChange={(e) => setFormOccurrenceType(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    {OCCURRENCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Criticidade
                  </label>
                  <select
                    value={formCriticality}
                    onChange={(e) =>
                      setFormCriticality(
                        e.target.value as StratifiedProblemCriticality
                      )
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    <option value="IMEDIATA">IMEDIATA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MÉDIA">MÉDIA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mês
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) =>
                      setFormMonth(e.target.value as StratifiedMonthShort)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    {STRATIFIED_MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Data
                  </label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Momento
                  </label>
                  <select
                    value={formMoment}
                    onChange={(e) =>
                      setFormMoment(e.target.value as StratifiedProblemMoment)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    <option value="Saída">Saída</option>
                    <option value="Retorno">Retorno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as StratifiedProblemCategory)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  >
                    <option value="Segurança">Segurança</option>
                    <option value="Qualidade">Qualidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Prazo (dias)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={formResolutionDays}
                    onChange={(e) => setFormResolutionDays(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Item / Descrição específica (opcional)
                </label>
                <input
                  type="text"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  placeholder="Ex.: Farol esquerdo queimado / Baia cortina rasgada"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D] mb-2"
                />
                <textarea
                  rows={2}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="Detalhes do desvio identificado na saída ou retorno..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#0B3C7D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
