import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  FilterX,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ComplianceCheckRecord,
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  Vehicle,
} from '../types/fleet';
import { STRATIFIED_MONTHS } from '../data/problemStratification';
import {
  QualityAuditExecutionRow,
  QualityChecklistFamilyId,
  QualityGrade,
  QualityIvConfig,
  buildQualityIvConfigRecord,
  computeQualityIvAnalysis,
  parseQualityIvConfig,
} from '../data/qualityIv';

interface QualityIvViewProps {
  vehicles: Vehicle[];
  complianceChecks: ComplianceCheckRecord[];
  safetyCheckDocs: LegalizedDocumentRecord[];
  visualStandardDocs: LegalizedDocumentRecord[];
  blitzEntregaDocs: LegalizedDocumentRecord[];
  blitzPuxadaDocs: LegalizedDocumentRecord[];
  blitzEmpilhadeiraDocs: LegalizedDocumentRecord[];
  caminhoesDocs: LegalizedDocumentRecord[];
  puxadaCheckDocs: LegalizedDocumentRecord[];
  estratificacaoDocs: LegalizedDocumentRecord[];
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
}

type OperationTypeFilter = 'Entrega' | 'Puxada' | 'Armazém' | 'Frota Geral';

const GRADE_STYLE: Record<
  QualityGrade,
  { bar: string; dot: string; badge: string; text: string }
> = {
  Excelente: {
    bar: 'bg-emerald-500 hover:bg-emerald-600',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
  },
  Adequado: {
    bar: 'bg-[#2563EB] hover:bg-[#1D4ED8]',
    dot: 'bg-[#2563EB]',
    badge: 'bg-blue-50 text-[#1565D8] border-blue-200',
    text: 'text-[#1565D8]',
  },
  Atenção: {
    bar: 'bg-amber-500 hover:bg-amber-600',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
  },
  Crítico: {
    bar: 'bg-rose-500 hover:bg-rose-600',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
  },
};

function scoreBarFill(score: number): string {
  if (score >= 90) return 'bg-emerald-500 group-hover:bg-emerald-600';
  if (score >= 78) return 'bg-[#2563EB] group-hover:bg-[#1D4ED8]';
  if (score >= 62) return 'bg-amber-500 group-hover:bg-amber-600';
  return 'bg-rose-500 group-hover:bg-rose-600';
}

function scoreTextClass(score: number): string {
  if (score >= 90) return 'text-emerald-700';
  if (score >= 78) return 'text-[#1565D8]';
  if (score >= 62) return 'text-amber-700';
  return 'text-rose-700';
}

function heatCellClass(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-400 border-slate-200/70';
  if (score >= 90) return 'bg-emerald-500 text-white border-emerald-600/30';
  if (score >= 78) return 'bg-[#2563EB] text-white border-blue-700/30';
  if (score >= 62) return 'bg-amber-400 text-slate-950 border-amber-500/40';
  return 'bg-rose-500 text-white border-rose-600/30';
}

export const QualityIvView: React.FC<QualityIvViewProps> = ({
  vehicles,
  complianceChecks,
  safetyCheckDocs,
  visualStandardDocs,
  blitzEntregaDocs,
  blitzPuxadaDocs,
  blitzEmpilhadeiraDocs,
  caminhoesDocs,
  puxadaCheckDocs,
  estratificacaoDocs,
  onAddRecords,
  onUpdateRecord,
}) => {
  const savedConfig = useMemo(
    () => parseQualityIvConfig(estratificacaoDocs),
    [estratificacaoDocs]
  );

  const [selectedMonth, setSelectedMonth] = useState<StratifiedMonthShort | 'ALL'>('ALL');
  const [selectedFamily, setSelectedFamily] = useState<QualityChecklistFamilyId | 'ALL'>('ALL');
  const [selectedOperation, setSelectedOperation] = useState<OperationTypeFilter | 'ALL'>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<QualityGrade | 'ALL'>('ALL');
  const [selectedPlate, setSelectedPlate] = useState<string | 'ALL'>('ALL');

  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState('');
  const [recordsFlagFilter, setRecordsFlagFilter] = useState<'ALL' | 'FLAGGED' | 'CLEAN'>('ALL');
  const [selectedExecution, setSelectedExecution] =
    useState<QualityAuditExecutionRow | null>(null);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [draftTarget, setDraftTarget] = useState<number>(savedConfig.targetIvPct);
  const [draftAuditor, setDraftAuditor] = useState<string>(savedConfig.auditorName);
  const [draftNotes, setDraftNotes] = useState<string>(savedConfig.auditNotes);
  const [notice, setNotice] = useState<string | null>(null);

  const analysis = useMemo(
    () =>
      computeQualityIvAnalysis({
        vehicles,
        complianceChecks,
        safetyCheckDocs,
        visualStandardDocs,
        blitzEntregaDocs,
        blitzPuxadaDocs,
        blitzEmpilhadeiraDocs,
        caminhoesDocs,
        puxadaCheckDocs,
        estratificacaoDocs,
        selectedMonth,
        selectedFamily,
        selectedOperation,
        selectedGrade,
        selectedPlate,
      }),
    [
      vehicles,
      complianceChecks,
      safetyCheckDocs,
      visualStandardDocs,
      blitzEntregaDocs,
      blitzPuxadaDocs,
      blitzEmpilhadeiraDocs,
      caminhoesDocs,
      puxadaCheckDocs,
      estratificacaoDocs,
      selectedMonth,
      selectedFamily,
      selectedOperation,
      selectedGrade,
      selectedPlate,
    ]
  );

  const hasFilters =
    selectedMonth !== 'ALL' ||
    selectedFamily !== 'ALL' ||
    selectedOperation !== 'ALL' ||
    selectedGrade !== 'ALL' ||
    selectedPlate !== 'ALL';

  const clearFilters = () => {
    setSelectedMonth('ALL');
    setSelectedFamily('ALL');
    setSelectedOperation('ALL');
    setSelectedGrade('ALL');
    setSelectedPlate('ALL');
  };

  const targetDelta = analysis.ivScorePct - savedConfig.targetIvPct;

  // Visible months for monthly chart
  const visibleMonthlyPoints = useMemo(() => {
    const hasLate = analysis.monthlySeries.some(
      (p) =>
        (p.month === 'SET' || p.month === 'OUT' || p.month === 'NOV' || p.month === 'DEZ') &&
        p.ivPct !== null
    );
    return hasLate ? analysis.monthlySeries : analysis.monthlySeries.slice(0, 8);
  }, [analysis.monthlySeries]);

  // SVG Trend polyline coordinates for monthly conformity & traceability overlay
  const monthlyTrendSvg = useMemo(() => {
    const w = 480;
    const h = 150;
    const n = visibleMonthlyPoints.length || 1;
    const step = w / n;
    const toPoint = (idx: number, val: number | null) => {
      const x = Math.round((idx + 0.5) * step);
      const y = Math.round(h - ((val ?? 0) / 100) * (h - 24) - 10);
      return { x, y, val };
    };
    const confPts = visibleMonthlyPoints
      .map((p, i) => toPoint(i, p.conformityPct))
      .filter((p) => p.val !== null);
    const tracePts = visibleMonthlyPoints
      .map((p, i) => toPoint(i, p.traceabilityPct))
      .filter((p) => p.val !== null);

    return {
      w,
      h,
      confPath: confPts.map((p) => `${p.x},${p.y}`).join(' '),
      tracePath: tracePts.map((p) => `${p.x},${p.y}`).join(' '),
      confPts,
      tracePts,
    };
  }, [visibleMonthlyPoints]);

  // Radar Pentagon SVG geometry for the 5 IV pillars
  const radarData = useMemo(() => {
    const cx = 115;
    const cy = 104;
    const maxR = 72;
    const axes = [
      { label: 'Cobertura', value: analysis.pillars.coberturaPct },
      { label: 'Rastreio', value: analysis.pillars.rastreabilidadePct },
      { label: 'Rigor', value: analysis.pillars.rigorPct },
      { label: 'Conform.', value: analysis.pillars.conformidadePct },
      { label: 'Tratativa', value: analysis.pillars.tratativaPct },
    ];
    const pointAt = (idx: number, pct: number) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / axes.length;
      const r = (Math.max(0, Math.min(100, pct)) / 100) * maxR;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    };
    const rings = [25, 50, 75, 100].map((lvl) =>
      axes.map((_, i) => {
        const pt = pointAt(i, lvl);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(' ')
    );
    const targetPoly = axes
      .map((_, i) => {
        const pt = pointAt(i, savedConfig.targetIvPct);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');
    const actualCoords = axes.map((a, i) => ({
      ...a,
      ...pointAt(i, a.value),
      labelPos: pointAt(i, 124),
    }));
    const actualPoly = actualCoords
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    return { cx, cy, maxR, rings, targetPoly, actualPoly, actualCoords, axes };
  }, [analysis.pillars, savedConfig.targetIvPct]);

  // Cross-check donut percentages
  const crossCheckDonut = useMemo(() => {
    const total = analysis.totals.crossCheckCount;
    const consistent = analysis.totals.crossCheckConsistentCount;
    const divergent = Math.max(0, total - consistent);
    const pct = total > 0 ? Math.round((consistent / total) * 100) : 100;
    const r = 34;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return { total, consistent, divergent, pct, r, c, offset };
  }, [analysis.totals]);

  // Pareto cumulative %
  const flagParetoWithCum = useMemo(() => {
    const total = analysis.flagPareto.reduce((s, f) => s + f.count, 0) || 1;
    const maxCount = analysis.flagPareto.reduce((m, f) => Math.max(m, f.count), 1);
    let running = 0;
    return analysis.flagPareto.map((item) => {
      running += item.count;
      return {
        ...item,
        cumPct: Math.round((running / total) * 100),
        barPct: Math.max(8, Math.round((item.count / maxCount) * 100)),
      };
    });
  }, [analysis.flagPareto]);

  const modalFilteredExecutions = useMemo(() => {
    const q = recordsSearch.trim().toLowerCase();
    return analysis.executions.filter((row) => {
      if (recordsFlagFilter === 'FLAGGED' && row.flags.length === 0) return false;
      if (recordsFlagFilter === 'CLEAN' && row.flags.length > 0) return false;
      if (!q) return true;
      return (
        row.plate.toLowerCase().includes(q) ||
        row.familyLabel.toLowerCase().includes(q) ||
        row.responsible.toLowerCase().includes(q) ||
        row.driverOrOperator.toLowerCase().includes(q) ||
        row.flags.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [analysis.executions, recordsFlagFilter, recordsSearch]);

  const openConfigModal = () => {
    setDraftTarget(savedConfig.targetIvPct);
    setDraftAuditor(savedConfig.auditorName);
    setDraftNotes(savedConfig.auditNotes);
    setConfigModalOpen(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const nextConfig: QualityIvConfig = {
      targetIvPct: draftTarget,
      auditorName: draftAuditor,
      auditNotes: draftNotes,
      updatedAt: new Date().toLocaleDateString('pt-BR'),
    };
    const record = buildQualityIvConfigRecord(nextConfig);
    const existing = estratificacaoDocs.find((d) => d.id === record.id);
    if (existing) {
      onUpdateRecord(existing.id, record);
    } else {
      onAddRecords([record]);
    }
    setConfigModalOpen(false);
    setNotice(`Meta IV atualizada para ${record.expiryDate}.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          Indicador: 'IV Geral dos Checklists (%)',
          Valor: `${analysis.ivScorePct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Conceito: analysis.grade,
        },
        {
          Indicador: 'Cobertura da Frota',
          Valor: `${analysis.pillars.coberturaPct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Conceito: `${analysis.totals.coveredAssetsCount}/${analysis.totals.activeFleetCount} veículos`,
        },
        {
          Indicador: 'Rastreabilidade & Preenchimento',
          Valor: `${analysis.pillars.rastreabilidadePct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Conceito: `${analysis.totals.cleanExecutionsPct}% sem desvios`,
        },
        {
          Indicador: 'Rigor & Consistência',
          Valor: `${analysis.pillars.rigorPct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Conceito: `${analysis.totals.crossCheckConsistentCount}/${analysis.totals.crossCheckCount} Blitz×Mensal`,
        },
        {
          Indicador: 'Conformidade Técnica Média',
          Valor: `${analysis.pillars.conformidadePct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Conceito: `${analysis.totals.totalItemsChecked} itens verificados`,
        },
        {
          Indicador: 'Efetividade de Tratativa (NOKs)',
          Valor: `${analysis.pillars.tratativaPct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Conceito: `${analysis.totals.resolvedNoks}/${analysis.totals.totalNoks} resolvidos`,
        },
      ]),
      'Resumo IV'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.families.map((f) => ({
          Checklist: f.label,
          Operacao: f.operation,
          Execucoes: f.executionsCount,
          Conformidade: `${f.avgConformityPct}%`,
          Rastreabilidade: `${f.avgTraceabilityPct}%`,
          Rigor: `${f.avgRigorPct}%`,
          IV_Modulo: `${f.ivScorePct}%`,
          Alertas: f.flaggedCount,
        }))
      ),
      'Checklists'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.executions.map((r) => ({
          Checklist: r.familyLabel,
          Operacao: r.operation,
          Mes: r.month,
          Data: r.date,
          Placa: r.plate,
          Momento: r.moment,
          Responsavel: r.responsible,
          Motorista_Operador: r.driverOrOperator,
          Conformidade: `${r.conformityPct}%`,
          Rastreio: `${r.traceabilityPct}%`,
          Rigor: `${r.rigorPct}%`,
          IV: `${r.qualityIvPct}%`,
          Conceito: r.grade,
          Apontamentos: r.flags.join(' | ') || 'Conforme',
        }))
      ),
      'Auditoria'
    );
    XLSX.writeFile(wb, '1_3_7_Qualidade_IV_Graficos.xlsx');
    setNotice('Relatório Excel de Qualidade (IV) exportado.');
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Header Toolbar */}
      <section className="rounded-xl bg-gradient-to-r from-[#06295A] via-[#0B3C7D] to-[#1354B3] text-white px-4 py-3 shadow-[0_6px_22px_rgba(6,41,90,0.15)] border border-[#1E5BB8]/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/15 text-[10px] font-bold tracking-wider uppercase text-blue-100">
                1.3.7 · INDICADOR DE VALOR (IV)
              </span>
              <span className="text-[11px] text-blue-100/90">
                Um Indicador de Valor (IV) está sendo monitorado para medir a qualidade dos checklists realizados
              </span>
            </div>
            <h2 className="font-display text-lg font-bold tracking-tight text-white mt-0.5">
              1.3.7 QUALIDADE (IV) — ANÁLISE GRÁFICA DOS CHECKLISTS
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por mês"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value as StratifiedMonthShort | 'ALL')
              }
              className="h-8 rounded-lg bg-white/12 hover:bg-white/18 border border-white/25 px-2.5 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="text-slate-900">
                Mês: Todos
              </option>
              {STRATIFIED_MONTHS.map((m) => (
                <option key={m} value={m} className="text-slate-900">
                  Mês: {m}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por checklist"
              value={selectedFamily}
              onChange={(e) =>
                setSelectedFamily(e.target.value as QualityChecklistFamilyId | 'ALL')
              }
              className="h-8 rounded-lg bg-white/12 hover:bg-white/18 border border-white/25 px-2.5 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="text-slate-900">
                Checklists: Todos (9)
              </option>
              {analysis.families.map((f) => (
                <option key={f.familyId} value={f.familyId} className="text-slate-900">
                  {f.shortLabel}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setRecordsModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ver Auditoria ({analysis.totals.totalExecutions})</span>
            </button>

            <button
              type="button"
              onClick={openConfigModal}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Meta: {savedConfig.targetIvPct}%</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active filter strip */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white border border-blue-200/90 px-3.5 py-2 text-xs">
          <span className="font-bold text-[#06295A]">Filtros ativos nos gráficos:</span>
          {selectedMonth !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedMonth('ALL')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EAF2FD] text-[#0B3C7D] font-semibold cursor-pointer"
            >
              Mês: {selectedMonth} <X className="w-3 h-3" />
            </button>
          )}
          {selectedFamily !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedFamily('ALL')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EAF2FD] text-[#0B3C7D] font-semibold cursor-pointer"
            >
              Checklist:{' '}
              {analysis.families.find((f) => f.familyId === selectedFamily)?.shortLabel}{' '}
              <X className="w-3 h-3" />
            </button>
          )}
          {selectedOperation !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedOperation('ALL')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EAF2FD] text-[#0B3C7D] font-semibold cursor-pointer"
            >
              Operação: {selectedOperation} <X className="w-3 h-3" />
            </button>
          )}
          {selectedGrade !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedGrade('ALL')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EAF2FD] text-[#0B3C7D] font-semibold cursor-pointer"
            >
              Conceito: {selectedGrade} <X className="w-3 h-3" />
            </button>
          )}
          {selectedPlate !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedPlate('ALL')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EAF2FD] text-[#0B3C7D] font-semibold cursor-pointer"
            >
              Placa: {selectedPlate} <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* ROW 0: 6 Compact Executive KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl bg-[#06295A] text-white px-4 py-3 shadow-[0_3px_12px_rgba(6,41,90,0.18)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono tabular-nums text-[26px] leading-tight font-extrabold">
              {analysis.ivScorePct}%
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                targetDelta >= 0
                  ? 'bg-emerald-400/20 text-emerald-200'
                  : 'bg-rose-400/20 text-rose-200'
              }`}
            >
              {targetDelta >= 0 ? `+${targetDelta}` : targetDelta} p.p.
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-blue-100">
            IV Geral ({analysis.grade})
          </div>
        </div>

        {[
          {
            val: `${analysis.pillars.coberturaPct}%`,
            label: `Cobertura (${analysis.totals.coveredAssetsCount}/${analysis.totals.activeFleetCount} placas)`,
          },
          {
            val: `${analysis.pillars.rastreabilidadePct}%`,
            label: 'Rastreabilidade e dados',
          },
          {
            val: `${analysis.pillars.rigorPct}%`,
            label: 'Rigor e consistência',
          },
          {
            val: `${analysis.pillars.conformidadePct}%`,
            label: `Conformidade (${analysis.totals.totalItemsChecked.toLocaleString('pt-BR')} itens)`,
          },
          {
            val: `${analysis.pillars.tratativaPct}%`,
            label: `Tratativa NOKs (${analysis.totals.resolvedIn1DayPct}% ≤1d)`,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex flex-col justify-between"
          >
            <div className="font-mono tabular-nums text-[26px] leading-tight font-extrabold text-[#06295A]">
              {kpi.val}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500 truncate">
              {kpi.label}
            </div>
          </div>
        ))}
      </section>

      {/* ROW 1: 3 Primary Analytical Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* CHART 1: EVOLUÇÃO MENSAL DO IV + CURVA DE CONFORMIDADE & RASTREABILIDADE */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                EVOLUÇÃO MENSAL DO IV × TENDÊNCIA
              </h3>
              <p className="text-[11px] text-slate-400">
                Barras = IV% · Linhas = Conformidade e Rastreio
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
              Meta {savedConfig.targetIvPct}%
            </span>
          </div>

          <div className="relative mt-3 h-44">
            {/* Target line */}
            <div
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-amber-500/80 z-10"
              style={{
                bottom: `${Math.max(16, Math.round(savedConfig.targetIvPct * 0.78) + 18)}px`,
              }}
            />

            {/* Trend lines SVG overlay */}
            <svg
              viewBox={`0 0 ${monthlyTrendSvg.w} ${monthlyTrendSvg.h}`}
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 top-1 bottom-5 w-full h-[calc(100%-24px)] z-20 overflow-visible"
            >
              {monthlyTrendSvg.confPts.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={monthlyTrendSvg.confPath}
                />
              )}
              {monthlyTrendSvg.tracePts.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={monthlyTrendSvg.tracePath}
                />
              )}
              {monthlyTrendSvg.confPts.map((pt, idx) => (
                <circle
                  key={`c-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.2"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
              ))}
            </svg>

            {/* Interactive Monthly Bars */}
            <div className="relative z-10 h-full flex items-end justify-between gap-1.5 pt-5">
              {visibleMonthlyPoints.map((m) => {
                const hasData = m.ivPct !== null;
                const val = m.ivPct ?? 0;
                const heightPct = hasData ? Math.max(14, Math.round(val * 0.92)) : 0;
                const isSelected = selectedMonth === m.month;
                const isDimmed = selectedMonth !== 'ALL' && !isSelected;

                return (
                  <button
                    key={m.month}
                    type="button"
                    disabled={!hasData}
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === m.month ? 'ALL' : m.month))
                    }
                    title={
                      hasData
                        ? `${m.month}: IV ${val}% | Conf. ${m.conformityPct}% | Rastreio ${m.traceabilityPct}%`
                        : `${m.month}: Sem dados`
                    }
                    className={`flex-1 h-full flex flex-col items-center justify-end gap-1 group ${
                      hasData ? 'cursor-pointer' : 'cursor-default opacity-40'
                    }`}
                  >
                    <span className="text-[10px] font-mono tabular-nums font-bold text-[#06295A]">
                      {hasData ? `${val}%` : '—'}
                    </span>
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full max-w-[30px] rounded-t-md transition-all ${
                          !hasData
                            ? 'bg-slate-200'
                            : isSelected
                              ? 'bg-[#06295A] ring-2 ring-[#1565D8]/40'
                              : isDimmed
                                ? 'bg-blue-200 group-hover:bg-[#3B82F6]'
                                : 'bg-[#2563EB]/85 group-hover:bg-[#1D4ED8]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
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

          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#2563EB]" /> IV (%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500" /> Conformidade (%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500" />{' '}
              Rastreio (%)
            </span>
          </div>
        </div>

        {/* CHART 2: RADAR DOS 5 PILARES DO IV + CONCEITO DE QUALIDADE */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                RADAR DOS 5 PILARES DO IV
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">
                Realizado × Meta ({savedConfig.targetIvPct}%)
              </span>
            </div>

            <div className="flex items-center justify-center mt-1">
              <svg viewBox="0 0 230 198" className="w-full max-w-[235px] h-[175px]">
                {radarData.rings.map((pts, idx) => (
                  <polygon
                    key={idx}
                    points={pts}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                ))}
                {radarData.actualCoords.map((pt, idx) => {
                  const outer = radarData.rings[3].split(' ')[idx];
                  const [ox, oy] = outer.split(',');
                  return (
                    <line
                      key={idx}
                      x1={radarData.cx}
                      y1={radarData.cy}
                      x2={ox}
                      y2={oy}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                    />
                  );
                })}
                {/* Meta polygon */}
                <polygon
                  points={radarData.targetPoly}
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                {/* Actual IV polygon */}
                <polygon
                  points={radarData.actualPoly}
                  fill="rgba(37, 99, 235, 0.22)"
                  stroke="#1565D8"
                  strokeWidth="2.2"
                />
                {radarData.actualCoords.map((pt) => (
                  <g key={pt.label}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      fill="#06295A"
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                    />
                    <text
                      x={pt.labelPos.x}
                      y={pt.labelPos.y - 4}
                      textAnchor="middle"
                      className="fill-[#06295A] text-[9px] font-bold"
                    >
                      {pt.label}
                    </text>
                    <text
                      x={pt.labelPos.x}
                      y={pt.labelPos.y + 7}
                      textAnchor="middle"
                      className="fill-[#1565D8] text-[9px] font-mono font-extrabold"
                    >
                      {pt.value}%
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
              CONCEITO DE QUALIDADE DOS CHECKS
            </h3>
            <div className="h-6 w-full rounded-md overflow-hidden flex bg-slate-100">
              {analysis.gradeDistribution.map((slice) => {
                if (slice.count === 0) return null;
                const st = GRADE_STYLE[slice.grade];
                const isSelected = selectedGrade === slice.grade;
                const isDimmed = selectedGrade !== 'ALL' && !isSelected;
                return (
                  <button
                    key={slice.grade}
                    type="button"
                    onClick={() =>
                      setSelectedGrade((prev) =>
                        prev === slice.grade ? 'ALL' : slice.grade
                      )
                    }
                    title={`${slice.grade}: ${slice.count} (${slice.pct}%)`}
                    style={{ width: `${Math.max(4, slice.pct)}%` }}
                    className={`h-full transition-all cursor-pointer ${st.bar} ${
                      isDimmed ? 'opacity-35' : ''
                    } ${isSelected ? 'ring-2 ring-inset ring-slate-900/35' : ''}`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {analysis.gradeDistribution.map((slice) => {
                const st = GRADE_STYLE[slice.grade];
                const isSelected = selectedGrade === slice.grade;
                return (
                  <button
                    key={slice.grade}
                    type="button"
                    onClick={() =>
                      setSelectedGrade((prev) =>
                        prev === slice.grade ? 'ALL' : slice.grade
                      )
                    }
                    className={`inline-flex items-center gap-1.5 text-[11px] cursor-pointer ${
                      selectedGrade !== 'ALL' && !isSelected
                        ? 'opacity-45'
                        : 'opacity-100'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${st.dot}`} />
                    <span className="font-semibold text-slate-700 font-mono tabular-nums">
                      {slice.grade}: {slice.count} ({slice.pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHART 3: IV POR OPERAÇÃO + COMPOSIÇÃO DOS ITENS & MOMENTO */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2.5">
              IV POR OPERAÇÃO (IV% × CONFORMIDADE%)
            </h3>
            <div className="space-y-2.5">
              {analysis.operationBreakdown.map((op) => {
                const isSelected = selectedOperation === op.operation;
                const isDimmed = selectedOperation !== 'ALL' && !isSelected;
                return (
                  <button
                    key={op.operation}
                    type="button"
                    onClick={() =>
                      setSelectedOperation((prev) =>
                        prev === op.operation ? 'ALL' : op.operation
                      )
                    }
                    className={`w-full text-left group cursor-pointer ${
                      isDimmed ? 'opacity-45' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span
                        className={`${
                          isSelected
                            ? 'font-extrabold text-[#06295A]'
                            : 'font-semibold text-slate-700 group-hover:text-[#06295A]'
                        }`}
                      >
                        {op.operation}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({op.executionsCount} checks)
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-[11px] font-extrabold text-[#06295A]">
                        IV {op.ivPct}%{' '}
                        <span className="text-slate-400 font-normal">
                          · Conf. {op.conformityPct}%
                        </span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2.5 w-full rounded bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${
                            isSelected ? 'bg-[#06295A]' : scoreBarFill(op.ivPct)
                          }`}
                          style={{ width: `${op.ivPct}%` }}
                        />
                      </div>
                      <div className="h-1.5 w-full rounded bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded bg-emerald-400/85"
                          style={{ width: `${op.conformityPct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Composição de Respostas + Momento */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                  COMPOSIÇÃO DAS RESPOSTAS NOS ITENS
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  {analysis.answerComposition.totalSlots.toLocaleString('pt-BR')} itens
                </span>
              </div>
              {analysis.answerComposition.totalSlots > 0 && (
                <>
                  <div className="h-5 w-full rounded-md overflow-hidden flex bg-slate-100">
                    {[
                      {
                        label: 'OK',
                        val: analysis.answerComposition.okTotal,
                        cls: 'bg-emerald-500',
                      },
                      {
                        label: 'N/A',
                        val: analysis.answerComposition.naTotal,
                        cls: 'bg-slate-400',
                      },
                      {
                        label: 'NOK',
                        val: analysis.answerComposition.nokTotal,
                        cls: 'bg-rose-500',
                      },
                      {
                        label: 'Vazio',
                        val: analysis.answerComposition.unansweredTotal,
                        cls: 'bg-amber-400',
                      },
                    ].map((seg) => {
                      const pct =
                        (seg.val / analysis.answerComposition.totalSlots) * 100;
                      if (seg.val <= 0) return null;
                      return (
                        <div
                          key={seg.label}
                          title={`${seg.label}: ${seg.val.toLocaleString('pt-BR')} (${pct.toFixed(1)}%)`}
                          style={{ width: `${pct}%` }}
                          className={`h-full ${seg.cls}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-[2px] bg-emerald-500" />
                      OK: {analysis.answerComposition.okTotal.toLocaleString('pt-BR')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-[2px] bg-slate-400" />
                      N/A: {analysis.answerComposition.naTotal.toLocaleString('pt-BR')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-[2px] bg-rose-500" />
                      NOK: {analysis.answerComposition.nokTotal.toLocaleString('pt-BR')}
                    </span>
                    {analysis.answerComposition.unansweredTotal > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-[2px] bg-amber-400" />
                        Pendente:{' '}
                        {analysis.answerComposition.unansweredTotal.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                IV MÉDIO POR MOMENTO DO CHECKLIST
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {analysis.momentBreakdown.map((m) => (
                  <div
                    key={m.moment}
                    className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 text-center"
                  >
                    <div
                      className={`font-mono tabular-nums text-sm font-extrabold ${scoreTextClass(
                        m.ivPct
                      )}`}
                    >
                      {m.ivPct}%
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 truncate">
                      {m.moment} ({m.count})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 2: 3 Quality Diagnostic Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* CHART 4: COMPARATIVO DE IV POR CHECKLIST DA PLATAFORMA */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                IV POR CHECKLIST DA PLATAFORMA (9 MÓDULOS)
              </h3>
              <p className="text-[10px] text-slate-400">
                Clique para filtrar · Linha vertical indica Meta {savedConfig.targetIvPct}%
              </p>
            </div>
          </div>

          <div className="relative space-y-2.5">
            {analysis.families.map((fam) => {
              const isSelected = selectedFamily === fam.familyId;
              const isDimmed = selectedFamily !== 'ALL' && !isSelected;
              const hasExecs = fam.executionsCount > 0;
              return (
                <button
                  key={fam.familyId}
                  type="button"
                  disabled={!hasExecs}
                  onClick={() =>
                    setSelectedFamily((prev) =>
                      prev === fam.familyId ? 'ALL' : fam.familyId
                    )
                  }
                  className={`w-full flex items-center gap-2 text-left group ${
                    hasExecs ? 'cursor-pointer' : 'opacity-45 cursor-default'
                  } ${isDimmed ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`w-32 shrink-0 text-[11px] truncate ${
                      isSelected
                        ? 'font-extrabold text-[#06295A]'
                        : 'font-medium text-slate-700 group-hover:text-[#06295A]'
                    }`}
                  >
                    {fam.shortLabel}
                  </span>
                  <div className="relative flex-1 h-4 bg-slate-100 rounded-[4px] overflow-hidden">
                    {/* Meta reference marker */}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 border-r border-dashed border-amber-600/70 z-10"
                      style={{ left: `${savedConfig.targetIvPct}%` }}
                    />
                    {hasExecs && (
                      <div
                        className={`h-full rounded-[4px] transition-all ${
                          isSelected ? 'bg-[#06295A]' : scoreBarFill(fam.ivScorePct)
                        }`}
                        style={{ width: `${Math.max(4, fam.ivScorePct)}%` }}
                      />
                    )}
                  </div>
                  <span
                    className={`w-10 text-right font-mono tabular-nums text-[11px] font-extrabold shrink-0 ${
                      hasExecs ? scoreTextClass(fam.ivScorePct) : 'text-slate-400'
                    }`}
                  >
                    {hasExecs ? `${fam.ivScorePct}%` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CHART 5: PARETO DE APONTAMENTOS QUE REDUZEM O IV */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-0.5">
              PARETO DOS APONTAMENTOS DE QUALIDADE
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">
              Principais motivos que impactam o IV dos checklists
            </p>

            {flagParetoWithCum.length === 0 ? (
              <div className="py-12 text-center text-xs text-emerald-700 font-semibold flex flex-col items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6" />
                <span>Nenhum desvio de preenchimento ou rigor no filtro atual!</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {flagParetoWithCum.map((row) => (
                  <div key={row.flag} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-700 truncate pr-2">
                        {row.flag}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#06295A] shrink-0">
                        {row.count}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({row.pct}% · acum. {row.cumPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-[3px] bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-[3px] bg-gradient-to-r from-[#F59E0B] to-[#EF4444]"
                        style={{ width: `${row.barPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Checklists sem desvios:</span>
            <span className="font-mono tabular-nums font-extrabold text-emerald-700">
              {analysis.totals.cleanExecutionsPct}% ({analysis.totals.totalExecutions - analysis.totals.flaggedExecutionsCount}/
              {analysis.totals.totalExecutions})
            </span>
          </div>
        </div>

        {/* CHART 6: CONSISTÊNCIA BLITZ × CHECK MENSAL (DONUT + PARES DUMBBELL) */}
        <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-0.5">
              CONSISTÊNCIA CRUZADA: BLITZ × CHECK MENSAL
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">
              Comparação de aderência na mesma placa e mês (tolerância ≤ 10 p.p.)
            </p>

            {crossCheckDonut.total === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Sem pares simultâneos de Blitz e Check Mensal para o filtro atual.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
                      <circle
                        cx="42"
                        cy="42"
                        r={crossCheckDonut.r}
                        fill="none"
                        stroke="#FEE2E2"
                        strokeWidth="9"
                      />
                      <circle
                        cx="42"
                        cy="42"
                        r={crossCheckDonut.r}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={crossCheckDonut.c}
                        strokeDashoffset={crossCheckDonut.offset}
                      />
                    </svg>
                    <span className="absolute font-mono tabular-nums text-sm font-extrabold text-[#06295A]">
                      {crossCheckDonut.pct}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-[#06295A]">
                      {crossCheckDonut.consistent} de {crossCheckDonut.total} consistentes
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Blitz
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Mensal
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {crossCheckDonut.divergent} divergência(s) &gt; 10 p.p.
                    </div>
                  </div>
                </div>

                {/* Dumbbell comparison bars */}
                <div className="space-y-2 pt-1">
                  {analysis.crossChecks.slice(0, 5).map((pair) => {
                    const minVal = Math.min(pair.blitzPct, pair.mensalPct);
                    const maxVal = Math.max(pair.blitzPct, pair.mensalPct);
                    return (
                      <button
                        key={`${pair.plate}-${pair.month}`}
                        type="button"
                        onClick={() =>
                          setSelectedPlate((prev) =>
                            prev === pair.plate ? 'ALL' : pair.plate
                          )
                        }
                        className="w-full text-left cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="font-mono font-bold text-[#06295A]">
                            {pair.plate} · {pair.month}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              pair.consistent ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            B:{pair.blitzPct}% / M:{pair.mensalPct}% (Δ{pair.diffPp}p.p.)
                          </span>
                        </div>
                        <div className="relative h-2.5 rounded-full bg-slate-100">
                          <div
                            className={`absolute top-1 bottom-1 rounded-full ${
                              pair.consistent ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                            style={{
                              left: `${minVal}%`,
                              width: `${Math.max(2, maxVal - minVal)}%`,
                            }}
                          />
                          <span
                            className="absolute top-0 w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-white -translate-x-1/2"
                            style={{ left: `${pair.blitzPct}%` }}
                          />
                          <span
                            className="absolute top-0 w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white -translate-x-1/2"
                            style={{ left: `${pair.mensalPct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ROW 3: 3 Fleet Ranking & Matrix Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* CHART 7: PLACAS COM MENOR IV (PRIORIDADE) */}
        <div className="lg:col-span-3 rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-0.5">
            PLACAS — MENOR IV (ATENÇÃO)
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">
            Clique na placa para filtrar os gráficos
          </p>
          <div className="space-y-2.5">
            {analysis.plateRankingBottom.map((p) => {
              const isSelected = selectedPlate === p.plate;
              return (
                <button
                  key={p.plate}
                  type="button"
                  onClick={() =>
                    setSelectedPlate((prev) => (prev === p.plate ? 'ALL' : p.plate))
                  }
                  className="w-full flex items-center gap-2 text-left group cursor-pointer"
                >
                  <span
                    className={`w-20 shrink-0 font-mono text-xs truncate ${
                      isSelected
                        ? 'font-extrabold text-[#06295A]'
                        : 'font-semibold text-slate-700 group-hover:text-[#06295A]'
                    }`}
                  >
                    {p.plate}
                  </span>
                  <div className="flex-1 h-3.5 rounded-[4px] bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-[4px] transition-all ${
                        isSelected
                          ? 'bg-[#06295A]'
                          : p.avgIvPct < 78
                            ? 'bg-rose-500 group-hover:bg-rose-600'
                            : 'bg-amber-500 group-hover:bg-amber-600'
                      }`}
                      style={{ width: `${Math.max(8, p.avgIvPct)}%` }}
                    />
                  </div>
                  <span
                    className={`w-10 text-right font-mono tabular-nums text-xs font-extrabold ${scoreTextClass(
                      p.avgIvPct
                    )}`}
                  >
                    {p.avgIvPct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CHART 8: PLACAS BENCHMARK (MAIOR IV) */}
        <div className="lg:col-span-3 rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-0.5">
            PLACAS — MAIOR IV (BENCHMARK)
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">
            Melhores índices de qualidade de checklist
          </p>
          <div className="space-y-2.5">
            {analysis.plateRankingTop.map((p) => {
              const isSelected = selectedPlate === p.plate;
              return (
                <button
                  key={p.plate}
                  type="button"
                  onClick={() =>
                    setSelectedPlate((prev) => (prev === p.plate ? 'ALL' : p.plate))
                  }
                  className="w-full flex items-center gap-2 text-left group cursor-pointer"
                >
                  <span
                    className={`w-20 shrink-0 font-mono text-xs truncate ${
                      isSelected
                        ? 'font-extrabold text-[#06295A]'
                        : 'font-semibold text-slate-700 group-hover:text-[#06295A]'
                    }`}
                  >
                    {p.plate}
                  </span>
                  <div className="flex-1 h-3.5 rounded-[4px] bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-[4px] transition-all ${
                        isSelected
                          ? 'bg-[#06295A]'
                          : 'bg-emerald-500 group-hover:bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(8, p.avgIvPct)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono tabular-nums text-xs font-extrabold text-emerald-700">
                    {p.avgIvPct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CHART 9: MATRIZ DE CALOR (HEATMAP) CHECKLIST × MÊS */}
        <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                MAPA DE CALOR (HEATMAP): IV (%) POR CHECKLIST × MÊS
              </h3>
              <p className="text-[10px] text-slate-400">
                Clique em qualquer célula para filtrar o módulo e mês correspondentes
              </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-[2px] bg-emerald-500" /> ≥90%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-[2px] bg-[#2563EB]" /> 78–89%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-[2px] bg-amber-400" /> 62–77%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-[2px] bg-rose-500" /> &lt;62%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[440px] space-y-1.5">
              {/* Header Months */}
              <div
                className="grid gap-1 items-center text-[10px] font-bold text-slate-500"
                style={{
                  gridTemplateColumns: `120px repeat(${analysis.heatmapMonths.length}, minmax(34px, 1fr))`,
                }}
              >
                <span>Checklist</span>
                {analysis.heatmapMonths.map((m) => (
                  <span key={m} className="text-center">
                    {m}
                  </span>
                ))}
              </div>

              {analysis.heatmapRows.map((row) => (
                <div
                  key={row.familyId}
                  className="grid gap-1 items-center"
                  style={{
                    gridTemplateColumns: `120px repeat(${analysis.heatmapMonths.length}, minmax(34px, 1fr))`,
                  }}
                >
                  <span className="text-[11px] font-semibold text-slate-700 truncate pr-1">
                    {row.shortLabel}
                  </span>
                  {row.cells.map((cell) => {
                    const isActiveCell =
                      selectedFamily === row.familyId && selectedMonth === cell.month;
                    return (
                      <button
                        key={cell.month}
                        type="button"
                        disabled={cell.ivPct === null}
                        onClick={() => {
                          if (isActiveCell) {
                            setSelectedFamily('ALL');
                            setSelectedMonth('ALL');
                          } else {
                            setSelectedFamily(row.familyId);
                            setSelectedMonth(cell.month);
                          }
                        }}
                        title={
                          cell.ivPct !== null
                            ? `${row.shortLabel} · ${cell.month}: IV ${cell.ivPct}% (${cell.count} checks)`
                            : `${row.shortLabel} · ${cell.month}: Sem registros`
                        }
                        className={`h-7 rounded border font-mono tabular-nums text-[10px] font-bold flex items-center justify-center transition-transform ${heatCellClass(
                          cell.ivPct
                        )} ${
                          cell.ivPct !== null
                            ? 'cursor-pointer hover:scale-[1.04]'
                            : 'cursor-default'
                        } ${isActiveCell ? 'ring-2 ring-[#06295A] ring-offset-1' : ''}`}
                      >
                        {cell.ivPct !== null ? `${cell.ivPct}` : '·'}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modal: Ver Auditoria (Detailed Executions List on demand) */}
      {recordsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setRecordsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-[#F7FAFE]">
              <div>
                <h4 className="text-sm font-extrabold text-[#06295A]">
                  Auditoria Individual dos Checklists Realizados ({modalFilteredExecutions.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Clique em qualquer execução para inspecionar os apontamentos de qualidade
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  {[
                    { key: 'ALL' as const, label: 'Todos' },
                    { key: 'FLAGGED' as const, label: 'Com alertas' },
                    { key: 'CLEAN' as const, label: '100% Conformes' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRecordsFlagFilter(opt.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                        recordsFlagFilter === opt.key
                          ? 'bg-white text-[#06295A] shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    placeholder="Buscar placa, inspetor..."
                    className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs w-48"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRecordsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Checklist</th>
                    <th className="py-2.5 px-2">Placa</th>
                    <th className="py-2.5 px-2">Mês/Data</th>
                    <th className="py-2.5 px-2">Responsável / Motorista</th>
                    <th className="py-2.5 px-2 text-right">Conf.</th>
                    <th className="py-2.5 px-2 text-right">Rastreio</th>
                    <th className="py-2.5 px-2 text-right">Rigor</th>
                    <th className="py-2.5 px-2 text-right">IV</th>
                    <th className="py-2.5 px-3">Apontamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {modalFilteredExecutions.slice(0, 150).map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedExecution(row)}
                      className="hover:bg-[#F7FAFF] cursor-pointer"
                    >
                      <td className="py-2 px-3 font-semibold text-[#06295A]">
                        {row.familyLabel}
                      </td>
                      <td className="py-2 px-2 font-mono font-bold">{row.plate}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">
                        {row.month} {row.date}
                      </td>
                      <td className="py-2 px-2 max-w-[180px] truncate">
                        {row.responsible} · {row.driverOrOperator}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {row.conformityPct}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {row.traceabilityPct}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {row.rigorPct}%
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`px-2 py-0.5 rounded border font-mono font-bold text-[11px] ${GRADE_STYLE[row.grade].badge}`}
                        >
                          {row.qualityIvPct}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-amber-800">
                        {row.flags.length === 0 ? (
                          <span className="text-emerald-700 font-medium">Conforme</span>
                        ) : (
                          row.flags.join(' · ')
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Execution Detail Modal */}
      {selectedExecution && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setSelectedExecution(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1565D8]">
                  Detalhamento de Qualidade (IV)
                </span>
                <h4 className="text-base font-bold text-[#06295A] mt-0.5">
                  {selectedExecution.familyLabel} — {selectedExecution.plate}
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedExecution.operation} · {selectedExecution.month}{' '}
                  {selectedExecution.date ? `(${selectedExecution.date})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExecution(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'IV Execução', val: `${selectedExecution.qualityIvPct}%` },
                { label: 'Conformidade', val: `${selectedExecution.conformityPct}%` },
                { label: 'Rastreio', val: `${selectedExecution.traceabilityPct}%` },
                { label: 'Rigor', val: `${selectedExecution.rigorPct}%` },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg bg-slate-50 border border-slate-200/80 py-2 px-1"
                >
                  <div className="font-mono tabular-nums text-base font-extrabold text-[#06295A]">
                    {m.val}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Apontamentos
              </h5>
              {selectedExecution.flags.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 shrink-0" />
                  <span>Checklist 100% conforme em rastreabilidade e rigor.</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {selectedExecution.flags.map((flag, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Config / Meta IV Modal */}
      {configModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setConfigModalOpen(false)}
        >
          <form
            onSubmit={handleSaveConfig}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#1565D8]" />
                <h4 className="text-base font-bold text-[#06295A]">
                  Parâmetros da Meta IV (%)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta do Indicador de Valor (IV %)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(Number(e.target.value) || 90)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm font-mono font-bold text-[#06295A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsável pela Auditoria
                </label>
                <input
                  type="text"
                  value={draftAuditor}
                  onChange={(e) => setDraftAuditor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas de Auditoria
                </label>
                <textarea
                  rows={3}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="h-9 px-3.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[#0B3C7D] hover:bg-[#06295A] text-white text-xs font-bold cursor-pointer"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
