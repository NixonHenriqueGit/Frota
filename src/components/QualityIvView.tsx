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

const GRADE_META: Record<
  QualityGrade,
  { color: string; label: string; badgeClass: string }
> = {
  Excelente: {
    color: '#10B981',
    label: 'Excelente (≥90%)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Adequado: {
    color: '#2563EB',
    label: 'Adequado (78–89%)',
    badgeClass: 'bg-blue-50 text-[#1565D8] border-blue-200',
  },
  Atenção: {
    color: '#F59E0B',
    label: 'Atenção (62–77%)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Crítico: {
    color: '#EF4444',
    label: 'Crítico (<62%)',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

function barGradient(score: number): string {
  if (score >= 90) return 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)';
  if (score >= 78) return 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)';
  if (score >= 62) return 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)';
  return 'linear-gradient(180deg, #F87171 0%, #DC2626 100%)';
}

function horizBarColor(score: number): string {
  if (score >= 90) return '#16A34A';
  if (score >= 78) return '#2563EB';
  if (score >= 62) return '#D97706';
  return '#DC2626';
}

function scoreTextClass(score: number): string {
  if (score >= 90) return 'text-emerald-700';
  if (score >= 78) return 'text-[#1565D8]';
  if (score >= 62) return 'text-amber-700';
  return 'text-rose-700';
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

  const [hoveredGrade, setHoveredGrade] = useState<QualityGrade | null>(null);
  const [rankingTab, setRankingTab] = useState<'vehicles' | 'inspectors'>('vehicles');

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

  const visibleMonthlyPoints = useMemo(() => {
    const hasLate = analysis.monthlySeries.some(
      (p) =>
        (p.month === 'SET' || p.month === 'OUT' || p.month === 'NOV' || p.month === 'DEZ') &&
        p.ivPct !== null
    );
    return hasLate ? analysis.monthlySeries : analysis.monthlySeries.slice(0, 8);
  }, [analysis.monthlySeries]);

  const gradeDonutData = useMemo(() => {
    const size = 166;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = analysis.totals.totalExecutions;
    let cumulative = 0;

    const slices = analysis.gradeDistribution.map((item) => {
      const pctFloat = total > 0 ? item.count / total : 0;
      const dashLength = pctFloat * circumference;
      const gapLength = circumference - dashLength;
      const dashOffset = -cumulative * circumference;
      cumulative += pctFloat;
      return {
        ...item,
        color: GRADE_META[item.grade].color,
        label: GRADE_META[item.grade].label,
        dashLength,
        gapLength,
        dashOffset,
      };
    });

    return { size, strokeWidth, radius, total, slices };
  }, [analysis.gradeDistribution, analysis.totals.totalExecutions]);

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
          Classificacao: analysis.grade,
        },
        {
          Indicador: 'Checklists Realizados',
          Valor: analysis.totals.totalExecutions,
          Meta: analysis.totals.activeFleetCount,
          Classificacao: `${analysis.totals.coveredAssetsCount} veículos`,
        },
        {
          Indicador: 'Itens Conformes',
          Valor: `${analysis.pillars.conformidadePct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Classificacao: `${analysis.totals.totalItemsChecked} itens`,
        },
        {
          Indicador: 'Preenchimento Completo',
          Valor: `${analysis.pillars.rastreabilidadePct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
          Classificacao: `${analysis.totals.cleanExecutionsPct}% íntegros`,
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
          Checklists: f.executionsCount,
          IV_Modulo: `${f.ivScorePct}%`,
          Conformidade: `${f.avgConformityPct}%`,
          Preenchimento: `${f.avgTraceabilityPct}%`,
        }))
      ),
      'Por Checklist'
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
          Responsavel: r.responsible,
          Motorista: r.driverOrOperator,
          IV: `${r.qualityIvPct}%`,
          Conformidade: `${r.conformityPct}%`,
          Preenchimento: `${r.traceabilityPct}%`,
        }))
      ),
      'Auditorias'
    );
    XLSX.writeFile(wb, '1.3.7_Qualidade_IV_Checklists.xlsx');
    setNotice('Planilha exportada com sucesso.');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Clean Header Bar */}
      <section className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#06295A]">
              1.3.7 Qualidade dos Checklists (IV)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Indicador de Valor dos checklists realizados · Meta {savedConfig.targetIvPct}%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por Operação"
              value={selectedOperation}
              onChange={(e) =>
                setSelectedOperation(e.target.value as OperationTypeFilter | 'ALL')
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todas operações</option>
              <option value="Entrega">Entrega</option>
              <option value="Puxada">Puxada</option>
              <option value="Armazém">Armazém</option>
              <option value="Frota Geral">Frota Geral</option>
            </select>

            <select
              aria-label="Filtrar por Mês"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value as StratifiedMonthShort | 'ALL')
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todos os meses</option>
              {STRATIFIED_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 px-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}

            <button
              type="button"
              onClick={openConfigModal}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1565D8]" />
              Meta
            </button>

            <button
              type="button"
              onClick={() => setRecordsModalOpen(true)}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#06295A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#1565D8]" />
              Ver lista ({analysis.totals.totalExecutions})
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="h-9 px-4 rounded-xl bg-[#0B3C7D] hover:bg-[#06295A] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>

        {(notice || selectedGrade !== 'ALL' || selectedPlate !== 'ALL' || selectedFamily !== 'ALL') && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-600">
              {selectedFamily !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedFamily('ALL')}
                  className="font-semibold text-[#06295A] hover:underline cursor-pointer"
                >
                  Checklist filtrado ×
                </button>
              )}
              {selectedGrade !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedGrade('ALL')}
                  className="font-semibold text-[#06295A] hover:underline cursor-pointer"
                >
                  Faixa: {selectedGrade} ×
                </button>
              )}
              {selectedPlate !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedPlate('ALL')}
                  className="font-semibold text-[#06295A] hover:underline cursor-pointer"
                >
                  Placa: {selectedPlate} ×
                </button>
              )}
            </div>
            {notice && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {notice}
              </span>
            )}
          </div>
        )}
      </section>

      {/* 4 Simple KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div
            className={`font-display text-3xl font-extrabold font-mono-tabular leading-none ${scoreTextClass(
              analysis.ivScorePct
            )}`}
          >
            {analysis.ivScorePct}%
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            IV Geral (Meta {savedConfig.targetIvPct}%)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="font-display text-3xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
            {analysis.totals.totalExecutions}
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            Checklists realizados
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="font-display text-3xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
            {analysis.pillars.conformidadePct}%
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            Itens conformes
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="font-display text-3xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
            {analysis.pillars.rastreabilidadePct}%
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            Preenchimento completo
          </div>
        </div>
      </section>

      {/* Row 1: 2 Simple Vertical Bar Charts (Monthly IV + Operation IV) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Chart 1: IV por Mês */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              IV (%) POR MÊS
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Linha tracejada: Meta {savedConfig.targetIvPct}%
            </span>
          </div>

          <div className="mt-4">
            <div className="relative h-[190px] pl-9 pr-1 pt-5">
              {/* Gridlines */}
              <div className="absolute inset-y-0 left-9 right-1 top-5 bottom-0 flex flex-col justify-between pointer-events-none">
                {[100, 50, 0].map((tick) => (
                  <div key={tick} className="relative flex items-center w-full">
                    <span className="absolute -left-9 w-7 text-right text-[11px] font-mono-tabular text-slate-400 leading-none">
                      {tick}%
                    </span>
                    <div
                      className={`w-full border-t ${
                        tick === 0 ? 'border-slate-300' : 'border-slate-100'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Meta Dashed Line */}
              <div
                className="absolute left-9 right-1 border-t-2 border-dashed border-amber-400 pointer-events-none z-20"
                style={{
                  top: `calc(1.25rem + ${(100 - savedConfig.targetIvPct) / 100} * (100% - 1.25rem))`,
                }}
              />

              {/* Bars */}
              <div
                className="relative z-10 h-full grid gap-2.5 items-end"
                style={{
                  gridTemplateColumns: `repeat(${visibleMonthlyPoints.length}, minmax(0, 1fr))`,
                }}
              >
                {visibleMonthlyPoints.map((pt) => {
                  const val = pt.ivPct ?? 0;
                  const active = selectedMonth === pt.month;
                  const dimmed = selectedMonth !== 'ALL' && !active;
                  return (
                    <button
                      key={pt.month}
                      type="button"
                      disabled={pt.ivPct === null}
                      onClick={() => setSelectedMonth(active ? 'ALL' : pt.month)}
                      title={`${pt.month}: ${val}% (${pt.executionsCount} checklists)`}
                      className="group h-full flex flex-col items-center justify-end cursor-pointer focus-visible:outline-none min-w-0"
                    >
                      {pt.ivPct !== null && (
                        <span className="text-xs font-bold font-mono-tabular text-[#06295A] mb-1 leading-none">
                          {val}%
                        </span>
                      )}
                      <div className="w-full max-w-[42px] flex-1 flex items-end justify-center">
                        <div
                          className="w-full rounded-t-lg transition-opacity group-hover:brightness-110"
                          style={{
                            height: pt.ivPct !== null ? `${Math.max(val, 6)}%` : '0%',
                            background: barGradient(val),
                            opacity: dimmed ? 0.35 : 1,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="pl-9 pr-1 pt-2 grid gap-2.5"
              style={{
                gridTemplateColumns: `repeat(${visibleMonthlyPoints.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleMonthlyPoints.map((pt) => (
                <button
                  key={pt.month}
                  type="button"
                  onClick={() =>
                    setSelectedMonth(selectedMonth === pt.month ? 'ALL' : pt.month)
                  }
                  className={`text-center text-xs cursor-pointer ${
                    selectedMonth === pt.month
                      ? 'font-bold text-[#06295A]'
                      : 'font-semibold text-slate-600'
                  }`}
                >
                  {pt.month}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: IV por Operação */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <h3 className="font-display text-sm font-bold text-[#06295A]">
            IV (%) POR OPERAÇÃO
          </h3>

          <div className="mt-4">
            <div className="relative h-[190px] pl-9 pr-1 pt-5">
              <div className="absolute inset-y-0 left-9 right-1 top-5 bottom-0 flex flex-col justify-between pointer-events-none">
                {[100, 50, 0].map((tick) => (
                  <div key={tick} className="relative flex items-center w-full">
                    <span className="absolute -left-9 w-7 text-right text-[11px] font-mono-tabular text-slate-400 leading-none">
                      {tick}%
                    </span>
                    <div
                      className={`w-full border-t ${
                        tick === 0 ? 'border-slate-300' : 'border-slate-100'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div
                className="relative z-10 h-full grid gap-4 items-end"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(1, analysis.operationBreakdown.length)}, minmax(0, 1fr))`,
                }}
              >
                {analysis.operationBreakdown.map((op) => {
                  const active = selectedOperation === op.operation;
                  const dimmed = selectedOperation !== 'ALL' && !active;
                  return (
                    <button
                      key={op.operation}
                      type="button"
                      onClick={() =>
                        setSelectedOperation(active ? 'ALL' : op.operation)
                      }
                      title={`${op.operation}: ${op.ivPct}% (${op.executionsCount} checklists)`}
                      className="group h-full flex flex-col items-center justify-end cursor-pointer focus-visible:outline-none min-w-0"
                    >
                      <span className="text-xs font-bold font-mono-tabular text-[#06295A] mb-1 leading-none">
                        {op.ivPct}%
                      </span>
                      <div className="w-full max-w-[52px] flex-1 flex items-end justify-center">
                        <div
                          className="w-full rounded-t-lg transition-opacity group-hover:brightness-110"
                          style={{
                            height: `${Math.max(op.ivPct, 6)}%`,
                            background: barGradient(op.ivPct),
                            opacity: dimmed ? 0.35 : 1,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="pl-9 pr-1 pt-2 grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, analysis.operationBreakdown.length)}, minmax(0, 1fr))`,
              }}
            >
              {analysis.operationBreakdown.map((op) => (
                <button
                  key={op.operation}
                  type="button"
                  onClick={() =>
                    setSelectedOperation(
                      selectedOperation === op.operation ? 'ALL' : op.operation
                    )
                  }
                  className={`text-center text-xs truncate cursor-pointer ${
                    selectedOperation === op.operation
                      ? 'font-bold text-[#06295A]'
                      : 'font-semibold text-slate-600'
                  }`}
                >
                  {op.operation}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: 3 Simple Visual Cards (Donut + Checklists + Veículos/Inspetores) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Chart 3: Classificação dos Checklists (Donut) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <h3 className="font-display text-sm font-bold text-[#06295A]">
            CLASSIFICAÇÃO DA QUALIDADE
          </h3>

          <div className="my-4 flex flex-col items-center gap-4">
            <div className="relative shrink-0 w-[160px] h-[160px]">
              <svg
                viewBox={`0 0 ${gradeDonutData.size} ${gradeDonutData.size}`}
                className="w-full h-full -rotate-90"
              >
                <circle
                  cx={gradeDonutData.size / 2}
                  cy={gradeDonutData.size / 2}
                  r={gradeDonutData.radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth={gradeDonutData.strokeWidth}
                />
                {gradeDonutData.total > 0 &&
                  gradeDonutData.slices
                    .filter((s) => s.count > 0)
                    .map((slice) => {
                      const isSelected =
                        selectedGrade === 'ALL' || selectedGrade === slice.grade;
                      const isHovered = hoveredGrade === slice.grade;
                      return (
                        <circle
                          key={slice.grade}
                          cx={gradeDonutData.size / 2}
                          cy={gradeDonutData.size / 2}
                          r={gradeDonutData.radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={
                            isHovered
                              ? gradeDonutData.strokeWidth + 4
                              : gradeDonutData.strokeWidth
                          }
                          strokeDasharray={`${Math.max(slice.dashLength - 1.2, 0)} ${
                            slice.gapLength + 1.2
                          }`}
                          strokeDashoffset={slice.dashOffset}
                          opacity={isSelected ? 1 : 0.3}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredGrade(slice.grade)}
                          onMouseLeave={() => setHoveredGrade(null)}
                          onClick={() =>
                            setSelectedGrade(
                              selectedGrade === slice.grade ? 'ALL' : slice.grade
                            )
                          }
                        />
                      );
                    })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="font-display text-2xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
                  {hoveredGrade
                    ? gradeDonutData.slices.find((s) => s.grade === hoveredGrade)?.count ??
                      gradeDonutData.total
                    : gradeDonutData.total}
                </span>
                <span className="text-xs font-medium text-slate-500 mt-1">
                  {hoveredGrade ?? 'Checklists'}
                </span>
              </div>
            </div>

            <ul className="w-full space-y-1.5">
              {gradeDonutData.slices.map((slice) => {
                const active = selectedGrade === slice.grade;
                return (
                  <li key={slice.grade}>
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredGrade(slice.grade)}
                      onMouseLeave={() => setHoveredGrade(null)}
                      onClick={() => setSelectedGrade(active ? 'ALL' : slice.grade)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-blue-50 font-semibold text-[#06295A]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate">{slice.label}</span>
                      </span>
                      <span className="font-mono-tabular shrink-0 font-bold text-[#06295A]">
                        {slice.count} ({slice.pct}%)
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Chart 4: IV por Checklist */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <h3 className="font-display text-sm font-bold text-[#06295A]">
            IV (%) POR CHECKLIST
          </h3>

          <div className="mt-4 space-y-2.5 flex-1">
            {analysis.families.map((fam) => {
              const active = selectedFamily === fam.familyId;
              const dimmed = selectedFamily !== 'ALL' && !active;
              return (
                <button
                  key={fam.familyId}
                  type="button"
                  onClick={() => setSelectedFamily(active ? 'ALL' : fam.familyId)}
                  style={{ opacity: dimmed ? 0.38 : 1 }}
                  className="w-full flex items-center gap-3 text-xs group cursor-pointer"
                >
                  <span className="w-32 shrink-0 text-left font-medium text-slate-700 group-hover:text-[#06295A] truncate">
                    {fam.shortLabel}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(5, fam.ivScorePct)}%`,
                        backgroundColor: horizBarColor(fam.ivScorePct),
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-bold font-mono-tabular text-[#06295A] shrink-0">
                    {fam.ivScorePct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart 5: Veículos ou Inspetores (Menor IV) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              {rankingTab === 'vehicles' ? 'VEÍCULOS · MENOR IV' : 'INSPETORES · IV MÉDIO'}
            </h3>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setRankingTab('vehicles')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  rankingTab === 'vehicles'
                    ? 'bg-white text-[#06295A] shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Veículos
              </button>
              <button
                type="button"
                onClick={() => setRankingTab('inspectors')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  rankingTab === 'inspectors'
                    ? 'bg-white text-[#06295A] shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Inspetores
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 flex-1">
            {rankingTab === 'vehicles' ? (
              analysis.plateRankingBottom.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Sem registros para os filtros atuais.
                </div>
              ) : (
                analysis.plateRankingBottom.map((item) => {
                  const active = selectedPlate === item.plate;
                  return (
                    <button
                      key={item.plate}
                      type="button"
                      onClick={() =>
                        setSelectedPlate(active ? 'ALL' : item.plate)
                      }
                      className={`w-full flex items-center gap-3 text-xs rounded-md px-1 py-0.5 cursor-pointer ${
                        active ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-24 shrink-0 text-left font-mono-tabular font-bold text-[#06295A] truncate">
                        {item.plate}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(5, item.avgIvPct)}%`,
                            backgroundColor: horizBarColor(item.avgIvPct),
                          }}
                        />
                      </div>
                      <span className="w-10 text-right font-bold font-mono-tabular text-[#06295A] shrink-0">
                        {item.avgIvPct}%
                      </span>
                    </button>
                  );
                })
              )
            ) : analysis.inspectorRanking.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Sem responsáveis nominais para os filtros atuais.
              </div>
            ) : (
              analysis.inspectorRanking.slice(0, 8).map((person) => (
                <div key={person.name} className="flex items-center gap-3 text-xs py-0.5">
                  <span className="w-28 shrink-0 text-left font-medium text-slate-700 truncate">
                    {person.name}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(5, person.avgIvPct)}%`,
                        backgroundColor: horizBarColor(person.avgIvPct),
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-bold font-mono-tabular text-[#06295A] shrink-0">
                    {person.avgIvPct}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Modal: Ver Lista */}
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
                <h4 className="font-display text-sm font-bold text-[#06295A]">
                  Lista de Checklists Auditados ({modalFilteredExecutions.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Clique em uma linha para ver os detalhes
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  {[
                    { key: 'ALL' as const, label: 'Todos' },
                    { key: 'FLAGGED' as const, label: 'Com alertas' },
                    { key: 'CLEAN' as const, label: 'Conformes' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRecordsFlagFilter(opt.key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
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
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Checklist</th>
                    <th className="py-2.5 px-2">Placa</th>
                    <th className="py-2.5 px-2">Mês/Data</th>
                    <th className="py-2.5 px-2">Responsável</th>
                    <th className="py-2.5 px-2 text-right">Conf.</th>
                    <th className="py-2.5 px-2 text-right">Preench.</th>
                    <th className="py-2.5 px-2 text-right">IV</th>
                    <th className="py-2.5 px-3">Situação</th>
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
                      <td className="py-2 px-2 font-mono-tabular font-bold">{row.plate}</td>
                      <td className="py-2 px-2 font-mono-tabular text-[11px]">
                        {row.month} {row.date}
                      </td>
                      <td className="py-2 px-2 max-w-[180px] truncate">
                        {row.responsible}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular">
                        {row.conformityPct}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular">
                        {row.traceabilityPct}%
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`px-2 py-0.5 rounded border font-mono-tabular font-bold text-[11px] ${
                            GRADE_META[row.grade].badgeClass
                          }`}
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
                <h4 className="font-display text-base font-bold text-[#06295A]">
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

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'IV Final', val: `${selectedExecution.qualityIvPct}%` },
                { label: 'Conformidade', val: `${selectedExecution.conformityPct}%` },
                { label: 'Preenchimento', val: `${selectedExecution.traceabilityPct}%` },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl bg-slate-50 border border-slate-200/80 py-2.5 px-2"
                >
                  <div className="font-mono-tabular text-base font-extrabold text-[#06295A]">
                    {m.val}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div>
              {selectedExecution.flags.length === 0 ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 shrink-0" />
                  <span>Checklist 100% conforme.</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {selectedExecution.flags.map((flag, i) => (
                    <li
                      key={i}
                      className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-2"
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
                <h4 className="font-display text-base font-bold text-[#06295A]">
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
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm font-mono-tabular font-bold text-[#06295A]"
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
                  Observações
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
