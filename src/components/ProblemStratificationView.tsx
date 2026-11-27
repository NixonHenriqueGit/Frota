import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Layers,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  ComplianceMonth,
  LegalizedDocumentRecord,
  ProblemAssetKind,
  ProblemCriticalityTier,
  ProblemResolutionStatus,
  ProblemSeverityLevel,
  StratifiedProblemRecord,
  Vehicle,
} from '../types/fleet';
import { BLITZ_MONTHS, getCurrentComplianceMonth } from '../data/blitzEntregaSeed';
import {
  OCCURRENCE_TYPE_OPTIONS,
  PROBLEM_CATALOG_PRESETS,
  buildStratifiedProblemRecord,
  collectStratifiedProblems,
  inferAssetKind,
  severityToCriticalityTier,
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

type StratificationDimension = 'asset' | 'occurrence' | 'driver';

interface BreakdownBucket {
  key: string;
  label: string;
  sublabel?: string;
  total: number;
  criticalCount: number;
  lessCriticalCount: number;
  immediateBlockCount: number;
}

const SEVERITY_BADGE_CLASS: Record<ProblemSeverityLevel, string> = {
  'BLOQUEIO IMEDIATO': 'bg-red-50 text-red-700 border-red-300 font-extrabold',
  GRAVE: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
  MÉDIO: 'bg-sky-50 text-sky-800 border-sky-300 font-semibold',
  LEVE: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
};

const STATUS_STYLE_CLASS: Record<ProblemResolutionStatus, string> = {
  Aberto: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80',
  'Em tratativa': 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80',
  Resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80',
};

const NEXT_STATUS_MAP: Record<ProblemResolutionStatus, ProblemResolutionStatus> = {
  Aberto: 'Em tratativa',
  'Em tratativa': 'Resolvido',
  Resolvido: 'Aberto',
};

export const ProblemStratificationView: React.FC<ProblemStratificationViewProps> = ({
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
  const [dimension, setDimension] = useState<StratificationDimension>('asset');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<'ALL' | ComplianceMonth>('ALL');
  const [assetKindFilter, setAssetKindFilter] = useState<'ALL' | ProblemAssetKind>('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState<
    'ALL' | ProblemCriticalityTier
  >('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ProblemSeverityLevel>('ALL');
  const [drilldownFilter, setDrilldownFilter] = useState<{
    dimension: StratificationDimension;
    value: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal state for registering a new digital occurrence
  const [modalOpen, setModalOpen] = useState(false);
  const [formPlate, setFormPlate] = useState('');
  const [formAssetKind, setFormAssetKind] =
    useState<ProblemAssetKind>('Veículo de Entrega');
  const [formDriver, setFormDriver] = useState('');
  const [formMonth, setFormMonth] = useState<ComplianceMonth>(() =>
    getCurrentComplianceMonth()
  );
  const [formDate, setFormDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [formPresetId, setFormPresetId] = useState<string>('vazamento-oleo');
  const [formOccurrenceType, setFormOccurrenceType] = useState<string>(
    PROBLEM_CATALOG_PRESETS[0].occurrenceType
  );
  const [formItemName, setFormItemName] = useState<string>(
    PROBLEM_CATALOG_PRESETS[0].itemName
  );
  const [formClassification, setFormClassification] = useState<'SEGURANÇA' | 'QUALIDADE'>(
    PROBLEM_CATALOG_PRESETS[0].classification
  );
  const [formSeverityLevel, setFormSeverityLevel] = useState<ProblemSeverityLevel>(
    PROBLEM_CATALOG_PRESETS[0].severityLevel
  );
  const [formDetails, setFormDetails] = useState<string>(
    PROBLEM_CATALOG_PRESETS[0].defaultDetails
  );

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const allProblems = useMemo(
    () =>
      collectStratifiedProblems({
        vehicles,
        blitzEntregaDocs,
        blitzPuxadaDocs,
        blitzEmpilhadeiraDocs,
        caminhoesDocs,
        puxadaCheckDocs,
        estratificacaoDocs,
      }),
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

  const baseFilteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProblems.filter((item) => {
      if (monthFilter !== 'ALL' && item.month !== monthFilter) return false;
      if (assetKindFilter !== 'ALL' && item.assetKind !== assetKindFilter) return false;
      if (criticalityFilter !== 'ALL' && item.criticalityTier !== criticalityFilter) {
        return false;
      }
      if (severityFilter !== 'ALL' && item.severityLevel !== severityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.plate.toLowerCase().includes(q) ||
        item.assetKind.toLowerCase().includes(q) ||
        item.driverOrOperator.toLowerCase().includes(q) ||
        item.occurrenceType.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.sourceLabel.toLowerCase().includes(q)
      );
    });
  }, [
    allProblems,
    monthFilter,
    assetKindFilter,
    criticalityFilter,
    severityFilter,
    search,
  ]);

  const tableProblems = useMemo(() => {
    if (!drilldownFilter) return baseFilteredProblems;
    return baseFilteredProblems.filter((item) => {
      if (drilldownFilter.dimension === 'asset') {
        return item.plate === drilldownFilter.value;
      }
      if (drilldownFilter.dimension === 'occurrence') {
        return item.occurrenceType === drilldownFilter.value;
      }
      return item.driverOrOperator === drilldownFilter.value;
    });
  }, [baseFilteredProblems, drilldownFilter]);

  const kpis = useMemo(() => {
    let criticalCount = 0;
    let lessCriticalCount = 0;
    let immediateBlockCount = 0;
    const assetsSet = new Set<string>();
    const driversSet = new Set<string>();

    for (const p of baseFilteredProblems) {
      if (p.criticalityTier === 'CRÍTICO') criticalCount += 1;
      else lessCriticalCount += 1;
      if (p.severityLevel === 'BLOQUEIO IMEDIATO') immediateBlockCount += 1;
      if (p.plate) assetsSet.add(p.plate);
      if (p.driverOrOperator && p.driverOrOperator !== 'Não informado') {
        driversSet.add(p.driverOrOperator);
      }
    }

    return {
      total: baseFilteredProblems.length,
      criticalCount,
      lessCriticalCount,
      immediateBlockCount,
      assetCount: assetsSet.size,
      driverCount: driversSet.size,
    };
  }, [baseFilteredProblems]);

  const breakdownByDimension = useMemo(() => {
    const buildBuckets = (
      getKey: (p: StratifiedProblemRecord) => { key: string; label: string; sublabel?: string }
    ): BreakdownBucket[] => {
      const map = new Map<string, BreakdownBucket>();
      for (const p of baseFilteredProblems) {
        const meta = getKey(p);
        const existing = map.get(meta.key) ?? {
          key: meta.key,
          label: meta.label,
          sublabel: meta.sublabel,
          total: 0,
          criticalCount: 0,
          lessCriticalCount: 0,
          immediateBlockCount: 0,
        };
        existing.total += 1;
        if (p.criticalityTier === 'CRÍTICO') existing.criticalCount += 1;
        else existing.lessCriticalCount += 1;
        if (p.severityLevel === 'BLOQUEIO IMEDIATO') {
          existing.immediateBlockCount += 1;
        }
        map.set(meta.key, existing);
      }
      return Array.from(map.values()).sort(
        (a, b) => b.criticalCount - a.criticalCount || b.total - a.total
      );
    };

    return {
      asset: buildBuckets((p) => ({
        key: p.plate,
        label: p.plate,
        sublabel: p.assetKind,
      })),
      occurrence: buildBuckets((p) => ({
        key: p.occurrenceType,
        label: p.occurrenceType,
      })),
      driver: buildBuckets((p) => ({
        key: p.driverOrOperator,
        label: p.driverOrOperator,
      })),
    };
  }, [baseFilteredProblems]);

  const activeBuckets = breakdownByDimension[dimension];
  const maxBucketTotal = useMemo(
    () => activeBuckets.reduce((max, b) => Math.max(max, b.total), 1),
    [activeBuckets]
  );

  const uniquePlateSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) {
      if (v.plate) set.add(v.plate.toUpperCase());
    }
    for (const p of allProblems) {
      if (p.plate) set.add(p.plate.toUpperCase());
    }
    return Array.from(set).sort();
  }, [vehicles, allProblems]);

  const handleOpenModal = (presetId?: string) => {
    const targetPreset =
      PROBLEM_CATALOG_PRESETS.find((p) => p.id === presetId) ??
      PROBLEM_CATALOG_PRESETS[0];
    const defaultPlate = uniquePlateSuggestions[0] ?? 'NPR2601';
    setFormPlate(defaultPlate);
    setFormAssetKind(inferAssetKind(defaultPlate, 'Veículo de Entrega', vehicles));
    setFormDriver('');
    setFormMonth(getCurrentComplianceMonth());
    setFormDate(new Date().toLocaleDateString('pt-BR'));
    setFormPresetId(targetPreset.id);
    setFormOccurrenceType(targetPreset.occurrenceType);
    setFormItemName(targetPreset.itemName);
    setFormClassification(targetPreset.classification);
    setFormSeverityLevel(targetPreset.severityLevel);
    setFormDetails(targetPreset.defaultDetails);
    setModalOpen(true);
  };

  const handleSelectPreset = (presetId: string) => {
    setFormPresetId(presetId);
    const preset = PROBLEM_CATALOG_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setFormOccurrenceType(preset.occurrenceType);
    setFormItemName(preset.itemName);
    setFormClassification(preset.classification);
    setFormSeverityLevel(preset.severityLevel);
    setFormDetails(preset.defaultDetails);
  };

  const handleSaveOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = formPlate.trim().toUpperCase();
    if (!cleanPlate || !formItemName.trim()) {
      showNotice('Informe a placa/código e a descrição do item.');
      return;
    }

    const record = buildStratifiedProblemRecord({
      month: formMonth,
      date: formDate.trim() || new Date().toLocaleDateString('pt-BR'),
      plate: cleanPlate,
      assetKind: formAssetKind,
      driverOrOperator: formDriver.trim() || 'Não informado',
      occurrenceType: formOccurrenceType,
      itemName: formItemName.trim(),
      classification: formClassification,
      severityLevel: formSeverityLevel,
      details: formDetails.trim(),
      status: 'Aberto',
    });

    onAddRecords([record]);
    setModalOpen(false);
    showNotice(
      `Ocorrência registrada em ${cleanPlate} (${severityToCriticalityTier(formSeverityLevel)}).`
    );
  };

  const handleCycleStatus = (item: StratifiedProblemRecord) => {
    if (!item.isEditable) return;
    const rawDoc = estratificacaoDocs.find((d) => d.id === item.id);
    if (!rawDoc) return;
    const nextStatus = NEXT_STATUS_MAP[item.status];
    const updatedDoc = buildStratifiedProblemRecord(
      {
        id: item.id,
        month: item.month,
        date: item.date,
        plate: item.plate,
        assetKind: item.assetKind,
        driverOrOperator: item.driverOrOperator,
        occurrenceType: item.occurrenceType,
        itemName: item.itemName,
        classification: item.classification,
        severityLevel: item.severityLevel,
        details: item.details,
        status: nextStatus,
      },
      rawDoc.uploadedAt
    );
    onUpdateRecord(rawDoc.id, {
      fileDataUrl: updatedDoc.fileDataUrl,
      fileSize: updatedDoc.fileSize,
      notes: updatedDoc.notes,
    });
    showNotice(`Status de ${item.plate} atualizado para "${nextStatus}".`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const toBucketRows = (buckets: BreakdownBucket[], colLabel: string) =>
      buckets.map((b) => ({
        [colLabel]: b.label,
        ...(b.sublabel ? { 'CATEGORIA ATIVO': b.sublabel } : {}),
        'TOTAL OCORRÊNCIAS': b.total,
        'ITENS CRÍTICOS': b.criticalCount,
        'BLOQUEIO IMEDIATO': b.immediateBlockCount,
        'MENOS CRÍTICOS': b.lessCriticalCount,
      }));

    const wsAsset = XLSX.utils.json_to_sheet(
      breakdownByDimension.asset.length > 0
        ? toBucketRows(breakdownByDimension.asset, 'VEÍCULO / EQUIPAMENTO')
        : [{ 'VEÍCULO / EQUIPAMENTO': 'Sem dados' }]
    );
    const wsOcc = XLSX.utils.json_to_sheet(
      breakdownByDimension.occurrence.length > 0
        ? toBucketRows(breakdownByDimension.occurrence, 'TIPO DE OCORRÊNCIA')
        : [{ 'TIPO DE OCORRÊNCIA': 'Sem dados' }]
    );
    const wsDriver = XLSX.utils.json_to_sheet(
      breakdownByDimension.driver.length > 0
        ? toBucketRows(breakdownByDimension.driver, 'MOTORISTA / OPERADOR')
        : [{ 'MOTORISTA / OPERADOR': 'Sem dados' }]
    );
    const wsFull = XLSX.utils.json_to_sheet(
      tableProblems.length > 0
        ? tableProblems.map((p) => ({
            ORIGEM: p.sourceLabel,
            MÊS: p.month,
            DATA: p.date,
            'VEÍCULO / EQUIPAMENTO': p.plate,
            MODAL: p.assetKind,
            'MOTORISTA / OPERADOR': p.driverOrOperator,
            'TIPO DE OCORRÊNCIA': p.occurrenceType,
            ITEM: p.itemName,
            CLASSIFICAÇÃO: p.classification,
            CRITICIDADE: p.criticalityTier,
            GRAVIDADE: p.severityLevel,
            DETALHES: p.details,
            STATUS: p.status,
          }))
        : [{ MENSAGEM: 'Nenhuma ocorrência filtrada' }]
    );

    XLSX.utils.book_append_sheet(wb, wsAsset, 'Por Veículo e Equip');
    XLSX.utils.book_append_sheet(wb, wsOcc, 'Por Tipo Ocorrência');
    XLSX.utils.book_append_sheet(wb, wsDriver, 'Por Motorista e Oper');
    XLSX.utils.book_append_sheet(wb, wsFull, 'Base Estratificada');

    XLSX.writeFile(wb, '1.3.3.4_Estratificacao_dos_Problemas.xlsx');
    showNotice('Planilha de estratificação exportada com sucesso.');
  };

  const hasFilters =
    search.trim() !== '' ||
    monthFilter !== 'ALL' ||
    assetKindFilter !== 'ALL' ||
    criticalityFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    drilldownFilter !== null;

  const clearAllFilters = () => {
    setSearch('');
    setMonthFilter('ALL');
    setAssetKindFilter('ALL');
    setCriticalityFilter('ALL');
    setSeverityFilter('ALL');
    setDrilldownFilter(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-3.5 py-0.5">
      {/* Top Navy Header */}
      <section className="rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white px-5 py-4 shadow-[0_6px_18px_rgba(11,60,125,0.18)] flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-blue-200/90">
            1.3 CHECK LIST DA FROTA · ANÁLISE DIGITAL
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold tracking-[0.015em] [word-spacing:0.12em]">
            1.3.3.4 ESTRATIFICAÇÃO DOS PROBLEMAS
          </h2>
          <p className="text-xs text-blue-100/85 mt-0.5 max-w-3xl">
            Armazenamento digital integrado para estratificação por veículo/equipamento de manuseio, tipo de ocorrência e motorista/operador, separando itens críticos de questões menos críticas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal('vazamento-oleo')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-blue-50 text-[#06295A] text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Ocorrência Digital</span>
          </button>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2">
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

      {/* KPI Strip */}
      <section
        aria-label="Resumo da estratificação de problemas"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-semibold text-slate-500">
            Total Estratificado
          </div>
          <div className="mt-1 font-mono tabular-nums text-2xl font-extrabold text-[#06295A]">
            {String(kpis.total).padStart(2, '0')}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Blitz · Checks Mensais · Registros 1.3.3.4
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setCriticalityFilter((curr) => (curr === 'CRÍTICO' ? 'ALL' : 'CRÍTICO'))
          }
          className={`text-left rounded-xl border px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all cursor-pointer ${
            criticalityFilter === 'CRÍTICO'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-200'
              : 'bg-white border-slate-200/90 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-red-700">
              Itens Críticos
            </span>
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
          </div>
          <div className="mt-1 font-mono tabular-nums text-2xl font-extrabold text-red-700">
            {String(kpis.criticalCount).padStart(2, '0')}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600">
            {kpis.immediateBlockCount} bloqueio imediato · ação urgente
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setCriticalityFilter((curr) =>
              curr === 'MENOS CRÍTICO' ? 'ALL' : 'MENOS CRÍTICO'
            )
          }
          className={`text-left rounded-xl border px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all cursor-pointer ${
            criticalityFilter === 'MENOS CRÍTICO'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200/90 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-sky-800">
              Questões Menos Críticas
            </span>
            <Wrench className="w-4 h-4 text-sky-600 shrink-0" />
          </div>
          <div className="mt-1 font-mono tabular-nums text-2xl font-extrabold text-sky-800">
            {String(kpis.lessCriticalCount).padStart(2, '0')}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600">
            Médio e Leve · tratativa programada
          </div>
        </button>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-semibold text-slate-500">
            Abrangência Operacional
          </div>
          <div className="mt-1 font-mono tabular-nums text-2xl font-extrabold text-[#06295A]">
            {String(kpis.assetCount).padStart(2, '0')}{' '}
            <span className="text-sm font-semibold text-slate-500">ativos</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
            {kpis.driverCount} motoristas / operadores identificados
          </div>
        </div>
      </section>

      {/* Item 4 Explicit Criticality Comparison Guide */}
      <section
        aria-label="Classificação clara de criticidade"
        className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#06295A]">
              Classificação de Criticidade do Checklist Digital
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Separação direta entre itens críticos de segurança/operação e desvios menos críticos para priorização de manutenção.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['BLOQUEIO IMEDIATO', 'GRAVE', 'MÉDIO', 'LEVE'] as ProblemSeverityLevel[]).map(
              (lvl) => {
                const active = severityFilter === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      setSeverityFilter((curr) => (curr === lvl ? 'ALL' : lvl))
                    }
                    className={`px-2.5 py-1 rounded-md border text-[11px] transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#0B3C7D] text-white border-[#0B3C7D] font-bold'
                        : `${SEVERITY_BADGE_CLASS[lvl]} hover:opacity-85`
                    }`}
                  >
                    {lvl}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-red-50/70 border border-red-200/90 p-3.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-extrabold text-red-800">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>ITENS CRÍTICOS · BLOQUEIO IMEDIATO / GRAVE</span>
              </div>
              <p className="text-xs text-red-900/85 mt-1 leading-relaxed">
                Ex.: <strong>Vazamento de óleo / hidráulico</strong>, falha de freios, luz de freio/farol queimada, cinto de segurança ou pneu abaixo do limite. Exige bloqueio ou correção imediata antes da saída.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal('vazamento-oleo')}
              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              + Crítico
            </button>
          </div>

          <div className="rounded-lg bg-sky-50/70 border border-sky-200/90 p-3.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900">
                <AlertTriangle className="w-4 h-4 text-sky-600 shrink-0" />
                <span>QUESTÕES MENOS CRÍTICAS · MÉDIO / LEVE</span>
              </div>
              <p className="text-xs text-sky-950/85 mt-1 leading-relaxed">
                Ex.: <strong>Pequenos danos na carroceria</strong>, arranhões leves no para-choque, limpeza 5S na cabine ou desgaste visual de adesivo. Não bloqueia operação e segue em manutenção programada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal('danos-carroceria')}
              className="px-2.5 py-1.5 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              + Menos Crítico
            </button>
          </div>
        </div>
      </section>

      {/* Item 3 Interactive 3-Dimension Stratification Panel */}
      <section className="rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="px-4 py-3 bg-[#F4F8FD] border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1.5 flex-wrap"
            role="tablist"
            aria-label="Dimensões de estratificação"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dimension === 'asset'}
              onClick={() => setDimension('asset')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                dimension === 'asset'
                  ? 'bg-[#0B3C7D] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-[#06295A]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Por Veículo / Equipamento ({breakdownByDimension.asset.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={dimension === 'occurrence'}
              onClick={() => setDimension('occurrence')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                dimension === 'occurrence'
                  ? 'bg-[#0B3C7D] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-[#06295A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Tipo de Ocorrência ({breakdownByDimension.occurrence.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={dimension === 'driver'}
              onClick={() => setDimension('driver')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                dimension === 'driver'
                  ? 'bg-[#0B3C7D] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-[#06295A]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Por Motorista / Operador ({breakdownByDimension.driver.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
              Crítico
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
              Menos Crítico
            </span>
          </div>
        </div>

        <div className="p-4">
          {activeBuckets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhuma ocorrência encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeBuckets.map((bucket) => {
                const isSelected =
                  drilldownFilter?.dimension === dimension &&
                  drilldownFilter.value === bucket.key;
                const critWidth = Math.round(
                  (bucket.criticalCount / maxBucketTotal) * 100
                );
                const lessWidth = Math.round(
                  (bucket.lessCriticalCount / maxBucketTotal) * 100
                );

                return (
                  <button
                    key={bucket.key}
                    type="button"
                    onClick={() =>
                      setDrilldownFilter((curr) =>
                        curr?.dimension === dimension && curr.value === bucket.key
                          ? null
                          : { dimension, value: bucket.key }
                      )
                    }
                    className={`text-left rounded-lg border p-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EAF2FD] border-[#0B3C7D] ring-1 ring-[#0B3C7D]/30'
                        : 'bg-slate-50/60 border-slate-200/90 hover:bg-white hover:border-[#1565D8]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#06295A] truncate">
                          {bucket.label}
                        </div>
                        {bucket.sublabel && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {bucket.sublabel}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums shrink-0">
                        {bucket.criticalCount > 0 && (
                          <span className="text-red-700 font-bold">
                            {bucket.criticalCount} crít.
                          </span>
                        )}
                        {bucket.lessCriticalCount > 0 && (
                          <span className="text-sky-800 font-semibold">
                            {bucket.lessCriticalCount} menos crít.
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-extrabold text-[#06295A]">
                          {bucket.total}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden flex">
                      {critWidth > 0 && (
                        <div
                          className="h-full bg-red-600 transition-all"
                          style={{ width: `${critWidth}%` }}
                        />
                      )}
                      {lessWidth > 0 && (
                        <div
                          className="h-full bg-sky-500 transition-all"
                          style={{ width: `${lessWidth}%` }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Filters + Detailed Analytical Table */}
      <section className="rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar placa, motorista, item..."
                aria-label="Buscar problemas estratificados"
                className="w-full h-9 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0B3C7D]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={assetKindFilter}
              onChange={(e) =>
                setAssetKindFilter(e.target.value as 'ALL' | ProblemAssetKind)
              }
              aria-label="Filtrar por tipo de veículo ou equipamento"
              className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0B3C7D]"
            >
              <option value="ALL">Todos os Veículos / Equip.</option>
              <option value="Veículo de Entrega">Veículo de Entrega</option>
              <option value="Equipamento de Manuseio">Equipamento de Manuseio</option>
              <option value="Veículo de Puxada">Veículo de Puxada</option>
            </select>

            <select
              value={monthFilter}
              onChange={(e) =>
                setMonthFilter(e.target.value as 'ALL' | ComplianceMonth)
              }
              aria-label="Filtrar por mês"
              className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0B3C7D]"
            >
              <option value="ALL">Todos os Meses</option>
              {BLITZ_MONTHS.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.month}
                </option>
              ))}
            </select>

            {drilldownFilter && (
              <button
                type="button"
                onClick={() => setDrilldownFilter(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#EAF2FD] border border-[#0B3C7D]/30 text-[#0B3C7D] text-xs font-bold cursor-pointer"
              >
                <Filter className="w-3 h-3" />
                <span>Filtro: {drilldownFilter.value}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
            <span className="text-xs font-mono tabular-nums font-bold text-slate-500">
              {tableProblems.length} {tableProblems.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-3 whitespace-nowrap">Veículo / Equip.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Motorista / Operador</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tipo de Ocorrência</th>
                <th className="py-2.5 px-3">Item / Problema</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Criticidade</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Origem · Mês</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Status / Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tableProblems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Nenhum problema encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                tableProblems.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.criticalityTier === 'CRÍTICO'
                        ? 'hover:bg-red-50/35'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 align-top whitespace-nowrap">
                      <div className="font-mono tabular-nums font-extrabold text-[#06295A]">
                        {item.plate}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.assetKind}</div>
                    </td>

                    <td className="py-2.5 px-3 align-top">
                      <div className="font-semibold text-slate-800">
                        {item.driverOrOperator}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top">
                      <div className="font-medium text-slate-700">
                        {item.occurrenceType}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.classification}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top max-w-xs">
                      <div className="font-semibold text-slate-900">
                        {item.itemName}
                      </div>
                      {item.details && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {item.details}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 align-top whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] ${SEVERITY_BADGE_CLASS[item.severityLevel]}`}
                        >
                          {item.severityLevel}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide ${
                            item.criticalityTier === 'CRÍTICO'
                              ? 'text-red-700'
                              : 'text-sky-700'
                          }`}
                        >
                          {item.criticalityTier === 'CRÍTICO'
                            ? 'Item Crítico'
                            : 'Menos Crítico'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-700">
                        {item.sourceLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {item.month}
                        {item.date ? ` · ${item.date}` : ''}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {item.isEditable ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCycleStatus(item)}
                              title="Clique para alternar o status da tratativa"
                              className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-colors cursor-pointer ${STATUS_STYLE_CLASS[item.status]}`}
                            >
                              {item.status}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRecord(item.id);
                                showNotice(`Ocorrência de ${item.plate} removida.`);
                              }}
                              title="Excluir ocorrência"
                              aria-label="Excluir ocorrência"
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Checklist {item.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Register Digital Problem Occurrence */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-strat-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] to-[#0B3C7D] text-white flex items-center justify-between gap-3">
              <div>
                <h3 id="modal-strat-title" className="font-display text-sm font-bold">
                  Registrar Ocorrência Digital · 1.3.3.4
                </h3>
                <p className="text-[11px] text-blue-100/85">
                  Os dados ficam salvos no banco digital para estratificação imediata.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar modal"
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOccurrence} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Quick Template Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Modelo Rápido de Classificação (Crítico vs Menos Crítico)
                </label>
                <select
                  value={formPresetId}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#0B3C7D] focus:outline-none"
                >
                  <optgroup label="Itens Críticos (Bloqueio Imediato / Grave)">
                    {PROBLEM_CATALOG_PRESETS.filter(
                      (p) => severityToCriticalityTier(p.severityLevel) === 'CRÍTICO'
                    ).map((p) => (
                      <option key={p.id} value={p.id}>
                        [CRÍTICO · {p.severityLevel}] {p.itemName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Questões Menos Críticas (Médio / Leve)">
                    {PROBLEM_CATALOG_PRESETS.filter(
                      (p) =>
                        severityToCriticalityTier(p.severityLevel) === 'MENOS CRÍTICO'
                    ).map((p) => (
                      <option key={p.id} value={p.id}>
                        [MENOS CRÍTICO · {p.severityLevel}] {p.itemName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Veículo / Equipamento *
                  </label>
                  <input
                    type="text"
                    list="strat-plate-options"
                    value={formPlate}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormPlate(val);
                      setFormAssetKind(inferAssetKind(val, formAssetKind, vehicles));
                    }}
                    placeholder="Ex.: NPR2601 ou EMP0008"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono font-bold uppercase text-slate-900 focus:border-[#0B3C7D] focus:outline-none"
                  />
                  <datalist id="strat-plate-options">
                    {uniquePlateSuggestions.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria do Ativo *
                  </label>
                  <select
                    value={formAssetKind}
                    onChange={(e) =>
                      setFormAssetKind(e.target.value as ProblemAssetKind)
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:border-[#0B3C7D] focus:outline-none"
                  >
                    <option value="Veículo de Entrega">Veículo de Entrega</option>
                    <option value="Equipamento de Manuseio">
                      Equipamento de Manuseio
                    </option>
                    <option value="Veículo de Puxada">Veículo de Puxada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motorista / Operador *
                  </label>
                  <input
                    type="text"
                    value={formDriver}
                    onChange={(e) => setFormDriver(e.target.value)}
                    placeholder="Nome do motorista ou operador"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-[#0B3C7D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Ocorrência *
                  </label>
                  <select
                    value={formOccurrenceType}
                    onChange={(e) => setFormOccurrenceType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:border-[#0B3C7D] focus:outline-none"
                  >
                    {OCCURRENCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Item Verificado *
                  </label>
                  <input
                    type="text"
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="Ex.: Vazamento de óleo / Pequenos danos na carroceria"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-[#0B3C7D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gravidade / Criticidade
                  </label>
                  <select
                    value={formSeverityLevel}
                    onChange={(e) =>
                      setFormSeverityLevel(e.target.value as ProblemSeverityLevel)
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:border-[#0B3C7D] focus:outline-none"
                  >
                    <option value="BLOQUEIO IMEDIATO">
                      BLOQUEIO IMEDIATO (Crítico)
                    </option>
                    <option value="GRAVE">GRAVE (Crítico)</option>
                    <option value="MÉDIO">MÉDIO (Menos Crítico)</option>
                    <option value="LEVE">LEVE (Menos Crítico)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Classificação
                  </label>
                  <select
                    value={formClassification}
                    onChange={(e) =>
                      setFormClassification(
                        e.target.value as 'SEGURANÇA' | 'QUALIDADE'
                      )
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:border-[#0B3C7D] focus:outline-none"
                  >
                    <option value="SEGURANÇA">SEGURANÇA</option>
                    <option value="QUALIDADE">QUALIDADE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mês
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) =>
                      setFormMonth(e.target.value as ComplianceMonth)
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:border-[#0B3C7D] focus:outline-none"
                  >
                    {BLITZ_MONTHS.map((m) => (
                      <option key={m.month} value={m.month}>
                        {m.month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data
                  </label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:border-[#0B3C7D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações / Ação Recomendada
                </label>
                <textarea
                  rows={2}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="Descreva a ocorrência e o impacto operacional..."
                  className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:border-[#0B3C7D] focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Salvar Ocorrência Digital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
