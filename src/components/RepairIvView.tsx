import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  Database,
  Download,
  FilterX,
  Search,
  SlidersHorizontal,
  Wrench,
  X,
} from 'lucide-react';
import {
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  StratifiedProblemCostCenter,
  StratifiedProblemCriticality,
  Vehicle,
} from '../types/fleet';
import {
  STRATIFIED_MONTHS,
  buildStratifiedResolutionRecord,
} from '../data/problemStratification';
import {
  RepairAnsBucket,
  RepairEnrichedRecord,
  RepairIvConfig,
  buildRepairIvConfigRecord,
  computeRepairIvAnalysis,
  parseRepairIvConfig,
} from '../data/repairIv';

interface RepairIvViewProps {
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

const ANS_BUCKET_META: Record<
  RepairAnsBucket,
  { color: string; badgeClass: string }
> = {
  'No prazo (ANS)': {
    color: '#1565D8',
    badgeClass: 'bg-blue-50 text-[#1565D8] border-blue-200',
  },
  'Fora do ANS': {
    color: '#60A5FA',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  'Em aberto': {
    color: '#06295A',
    badgeClass: 'bg-slate-100 text-[#06295A] border-slate-300',
  },
};

function barGradient(score: number): string {
  if (score >= 90) return 'linear-gradient(180deg, #2563EB 0%, #0B3C7D 100%)';
  if (score >= 78) return 'linear-gradient(180deg, #3B82F6 0%, #1565D8 100%)';
  if (score >= 62) return 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)';
  return 'linear-gradient(180deg, #93C5FD 0%, #3B82F6 100%)';
}

function scoreTextClass(score: number): string {
  if (score >= 90) return 'text-[#0B3C7D]';
  if (score >= 78) return 'text-[#1565D8]';
  if (score >= 62) return 'text-sky-700';
  return 'text-[#06295A]';
}

function daysColor(days: number, limitDays: number): string {
  if (days <= limitDays) return '#1565D8';
  if (days <= limitDays + 1.5) return '#3B82F6';
  return '#06295A';
}

export const RepairIvView: React.FC<RepairIvViewProps> = ({
  vehicles,
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
    () => parseRepairIvConfig(estratificacaoDocs),
    [estratificacaoDocs]
  );

  const [selectedMonth, setSelectedMonth] = useState<StratifiedMonthShort | 'ALL'>('ALL');
  const [selectedOperation, setSelectedOperation] =
    useState<StratifiedProblemCostCenter | 'ALL'>('ALL');
  const [selectedCriticality, setSelectedCriticality] =
    useState<StratifiedProblemCriticality | 'ALL'>('ALL');
  const [selectedAnsBucket, setSelectedAnsBucket] =
    useState<RepairAnsBucket | 'ALL'>('ALL');
  const [hoveredAns, setHoveredAns] = useState<RepairAnsBucket | null>(null);

  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState('');
  const [editingRepairRow, setEditingRepairRow] =
    useState<RepairEnrichedRecord | null>(null);
  const [draftRepairDays, setDraftRepairDays] = useState<number>(1);
  const [draftRepairResolved, setDraftRepairResolved] = useState<boolean>(true);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [draftTarget, setDraftTarget] = useState<number>(savedConfig.targetIvPct);
  const [draftAnsImediata, setDraftAnsImediata] = useState<number>(
    savedConfig.ansImediataDays
  );
  const [draftAnsAlta, setDraftAnsAlta] = useState<number>(savedConfig.ansAltaDays);
  const [draftAnsMedia, setDraftAnsMedia] = useState<number>(savedConfig.ansMediaDays);
  const [draftAuditor, setDraftAuditor] = useState<string>(savedConfig.auditorName);

  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const analysis = useMemo(
    () =>
      computeRepairIvAnalysis({
        vehicles,
        blitzEntregaDocs,
        blitzPuxadaDocs,
        blitzEmpilhadeiraDocs,
        caminhoesDocs,
        puxadaCheckDocs,
        estratificacaoDocs,
        selectedMonth,
        selectedOperation,
        selectedCriticality,
        selectedAnsBucket,
      }),
    [
      vehicles,
      blitzEntregaDocs,
      blitzPuxadaDocs,
      blitzEmpilhadeiraDocs,
      caminhoesDocs,
      puxadaCheckDocs,
      estratificacaoDocs,
      selectedMonth,
      selectedOperation,
      selectedCriticality,
      selectedAnsBucket,
    ]
  );

  const hasFilters =
    selectedMonth !== 'ALL' ||
    selectedOperation !== 'ALL' ||
    selectedCriticality !== 'ALL' ||
    selectedAnsBucket !== 'ALL';

  const clearFilters = () => {
    setSelectedMonth('ALL');
    setSelectedOperation('ALL');
    setSelectedCriticality('ALL');
    setSelectedAnsBucket('ALL');
  };

  // ANS Donut geometry
  const ansDonutData = useMemo(() => {
    const size = 166;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = analysis.totals.totalAnomalies;
    let cumulative = 0;

    const slices = analysis.ansDistribution.map((item) => {
      const pctFloat = total > 0 ? item.count / total : 0;
      const dashLength = pctFloat * circumference;
      const gapLength = circumference - dashLength;
      const dashOffset = -cumulative * circumference;
      cumulative += pctFloat;
      return {
        ...item,
        color: ANS_BUCKET_META[item.bucket].color,
        dashLength,
        gapLength,
        dashOffset,
      };
    });

    return { size, strokeWidth, radius, total, slices };
  }, [analysis.ansDistribution, analysis.totals.totalAnomalies]);

  const maxOccurrenceDays = useMemo(() => {
    return Math.max(
      savedConfig.ansMediaDays,
      ...analysis.byOccurrenceType.map((o) => o.avgDays),
      2
    );
  }, [analysis.byOccurrenceType, savedConfig.ansMediaDays]);

  const maxCritDays = useMemo(() => {
    return Math.max(
      savedConfig.ansMediaDays,
      ...analysis.byCriticality.map((c) => Math.max(c.avgDays, c.ansLimitDays)),
      2
    );
  }, [analysis.byCriticality, savedConfig.ansMediaDays]);

  const modalFilteredRecords = useMemo(() => {
    const q = recordsSearch.trim().toLowerCase();
    return analysis.records.filter((r) => {
      if (!q) return true;
      return (
        r.plate.toLowerCase().includes(q) ||
        r.occurrenceType.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.driverOrOperator.toLowerCase().includes(q) ||
        r.sourceLabel.toLowerCase().includes(q)
      );
    });
  }, [analysis.records, recordsSearch]);

  const openConfigModal = () => {
    setDraftTarget(savedConfig.targetIvPct);
    setDraftAnsImediata(savedConfig.ansImediataDays);
    setDraftAnsAlta(savedConfig.ansAltaDays);
    setDraftAnsMedia(savedConfig.ansMediaDays);
    setDraftAuditor(savedConfig.auditorName);
    setConfigModalOpen(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const nextConfig: RepairIvConfig = {
      targetIvPct: draftTarget,
      ansImediataDays: Math.max(1, draftAnsImediata),
      ansAltaDays: Math.max(1, draftAnsAlta),
      ansMediaDays: Math.max(1, draftAnsMedia),
      auditorName: draftAuditor.trim() || 'Gestão Frota PB',
      updatedAt: new Date().toLocaleDateString('pt-BR'),
    };
    const rec = buildRepairIvConfigRecord(nextConfig);
    const existing = estratificacaoDocs.find((d) => d.id === rec.id);
    if (existing) {
      onUpdateRecord(existing.id, rec);
    } else {
      onAddRecords([rec]);
    }
    setConfigModalOpen(false);
    showNotice(`Meta (${nextConfig.targetIvPct}%) e limites de ANS atualizados.`);
  };

  const handleSaveRepairOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepairRow) return;
    const rec = buildStratifiedResolutionRecord({
      targetId: editingRepairRow.id,
      resolved: draftRepairResolved,
      resolutionDays: Math.max(0, Number(draftRepairDays) || 0),
      moment: editingRepairRow.moment,
    });
    const existing = estratificacaoDocs.find((d) => d.id === rec.id);
    if (existing) {
      onUpdateRecord(existing.id, rec);
    } else {
      onAddRecords([rec]);
    }
    setEditingRepairRow(null);
    showNotice(`Reparo da placa ${editingRepairRow.plate} atualizado.`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          Indicador: 'IV Tempo de Reparo (%)',
          Valor: `${analysis.ivReparoPct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
        },
        {
          Indicador: 'Tempo médio para corrigir NOK (dias)',
          Valor: analysis.avgRepairDays,
          Meta: `${savedConfig.ansAltaDays} d`,
        },
        {
          Indicador: 'Resposta a defeitos críticos (IMEDIATA)',
          Valor: analysis.criticalResponseDays,
          Meta: `${savedConfig.ansImediataDays} d`,
        },
        {
          Indicador: 'Aderência ao ANS de corretivas',
          Valor: `${analysis.ansAdherencePct}%`,
          Meta: `${savedConfig.targetIvPct}%`,
        },
      ]),
      'Resumo Reparo IV'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.records.map((r) => ({
          Mes: r.month,
          Data: r.date,
          Placa: r.plate,
          Operacao: r.costCenter,
          Origem: r.sourceLabel,
          Tipo: r.occurrenceType,
          Item_NOK: r.itemName,
          Criticidade: r.criticality,
          Dias_Reparo: r.resolutionDays,
          ANS_Limite_Dias: r.ansLimitDays,
          Situacao_ANS: r.ansBucket,
        }))
      ),
      'Anomalias e Reparos'
    );
    XLSX.writeFile(wb, '1.3.8_Tempo_Reparo_ANS_IV.xlsx');
    showNotice('Planilha exportada com sucesso.');
  };

  const lastThreeDelta = analysis.lastThreeAvgIvPct - savedConfig.targetIvPct;

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <section className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#06295A]">
              1.3.8 Tempo de Reparo e ANS das Anomalias (IV)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tempo para correção de itens NOK, resposta a defeitos críticos e aderência ao ANS (últimos 3 meses)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por Operação"
              value={selectedOperation}
              onChange={(e) =>
                setSelectedOperation(
                  e.target.value as StratifiedProblemCostCenter | 'ALL'
                )
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todas operações</option>
              <option value="Entrega">Entrega</option>
              <option value="Puxada">Puxada</option>
              <option value="Armazém">Armazém</option>
            </select>

            <select
              aria-label="Filtrar por Criticidade"
              value={selectedCriticality}
              onChange={(e) =>
                setSelectedCriticality(
                  e.target.value as StratifiedProblemCriticality | 'ALL'
                )
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todas criticidades</option>
              <option value="IMEDIATA">IMEDIATA (Crítico)</option>
              <option value="ALTA">ALTA</option>
              <option value="MÉDIA">MÉDIA</option>
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
              Meta & ANS
            </button>

            <button
              type="button"
              onClick={() => setRecordsModalOpen(true)}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#06295A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#1565D8]" />
              Anomalias ({analysis.totals.totalAnomalies})
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

        {(notice || selectedAnsBucket !== 'ALL') && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              {selectedAnsBucket !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedAnsBucket('ALL')}
                  className="font-semibold text-[#06295A] hover:underline cursor-pointer"
                >
                  Situação ANS: {selectedAnsBucket} ×
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

      {/* 4 Clean KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div
            className={`font-display text-3xl font-extrabold font-mono-tabular leading-none ${scoreTextClass(
              analysis.ivReparoPct
            )}`}
          >
            {analysis.ivReparoPct}%
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            IV Tempo de Reparo (Meta {savedConfig.targetIvPct}%)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="font-display text-3xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
            {analysis.avgRepairDays.toFixed(1)} d
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            Tempo médio para corrigir NOK
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="font-display text-3xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
            {analysis.criticalResponseDays.toFixed(1)} d
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            Resposta a defeitos críticos (ANS ≤ {savedConfig.ansImediataDays}d)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div
            className={`font-display text-3xl font-extrabold font-mono-tabular leading-none ${scoreTextClass(
              analysis.ansAdherencePct
            )}`}
          >
            {analysis.ansAdherencePct}%
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1.5">
            Aderência ao ANS de corretivas
          </div>
        </div>
      </section>

      {/* Row 1: Chart 1 (IV por Mês) + Chart 2 (Últimos 3 Meses vs Meta) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Chart 1 */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              IV DE REPARO (%) POR MÊS
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Linha tracejada: Meta {savedConfig.targetIvPct}%
            </span>
          </div>

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
                className="absolute left-9 right-1 border-t-2 border-dashed border-sky-400 pointer-events-none z-20"
                style={{
                  top: `calc(1.25rem + ${(100 - savedConfig.targetIvPct) / 100} * (100% - 1.25rem))`,
                }}
              />

              <div
                className="relative z-10 h-full grid gap-2.5 items-end"
                style={{
                  gridTemplateColumns: `repeat(${analysis.monthlySeries.length}, minmax(0, 1fr))`,
                }}
              >
                {analysis.monthlySeries.map((pt) => {
                  const val = pt.ivReparoPct ?? 0;
                  const active = selectedMonth === pt.month;
                  const dimmed = selectedMonth !== 'ALL' && !active;
                  return (
                    <button
                      key={pt.month}
                      type="button"
                      disabled={pt.ivReparoPct === null}
                      onClick={() => setSelectedMonth(active ? 'ALL' : pt.month)}
                      title={`${pt.month}: IV ${val}% · Média ${pt.avgDays ?? 0}d (${pt.totalCount} NOKs)`}
                      className="group h-full flex flex-col items-center justify-end cursor-pointer focus-visible:outline-none min-w-0"
                    >
                      {pt.ivReparoPct !== null && (
                        <span className="text-xs font-bold font-mono-tabular text-[#06295A] mb-1 leading-none">
                          {val}%
                        </span>
                      )}
                      <div className="w-full max-w-[42px] flex-1 flex items-end justify-center">
                        <div
                          className="w-full rounded-t-lg transition-opacity group-hover:brightness-110"
                          style={{
                            height: pt.ivReparoPct !== null ? `${Math.max(val, 6)}%` : '0%',
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
                gridTemplateColumns: `repeat(${analysis.monthlySeries.length}, minmax(0, 1fr))`,
              }}
            >
              {analysis.monthlySeries.map((pt) => (
                <button
                  key={pt.month}
                  type="button"
                  onClick={() =>
                    setSelectedMonth(selectedMonth === pt.month ? 'ALL' : pt.month)
                  }
                  className={`text-center text-xs cursor-pointer ${
                    selectedMonth === pt.month
                      ? 'font-bold text-[#06295A]'
                      : pt.isLastThree
                        ? 'font-bold text-[#1565D8]'
                        : 'font-semibold text-slate-600'
                  }`}
                >
                  {pt.month}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Últimos 3 Meses vs Meta */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              ÚLTIMOS 3 MESES × META ({savedConfig.targetIvPct}%)
            </h3>
            <span
              className={`text-xs font-bold font-mono-tabular ${
                lastThreeDelta >= 0 ? 'text-[#1565D8]' : 'text-[#06295A]'
              }`}
            >
              Média: {analysis.lastThreeAvgIvPct}% ({lastThreeDelta >= 0 ? `+${lastThreeDelta}` : lastThreeDelta} p.p.)
            </span>
          </div>

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
                className="absolute left-9 right-1 border-t-2 border-dashed border-sky-400 pointer-events-none z-20"
                style={{
                  top: `calc(1.25rem + ${(100 - savedConfig.targetIvPct) / 100} * (100% - 1.25rem))`,
                }}
              />

              <div
                className="relative z-10 h-full grid gap-6 items-end"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(1, analysis.lastThreeMonths.length)}, minmax(0, 1fr))`,
                }}
              >
                {analysis.lastThreeMonths.map((pt) => {
                  const val = pt.ivReparoPct ?? 0;
                  return (
                    <button
                      key={pt.month}
                      type="button"
                      onClick={() =>
                        setSelectedMonth(selectedMonth === pt.month ? 'ALL' : pt.month)
                      }
                      className="group h-full flex flex-col items-center justify-end cursor-pointer focus-visible:outline-none"
                    >
                      <span className="text-xs font-extrabold font-mono-tabular text-[#06295A] mb-1 leading-none">
                        {val}%
                      </span>
                      <div className="w-full max-w-[58px] flex-1 flex items-end justify-center">
                        <div
                          className="w-full rounded-t-lg transition-opacity group-hover:brightness-110"
                          style={{
                            height: `${Math.max(val, 6)}%`,
                            background: barGradient(val),
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="pl-9 pr-1 pt-2 grid gap-6"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, analysis.lastThreeMonths.length)}, minmax(0, 1fr))`,
              }}
            >
              {analysis.lastThreeMonths.map((pt) => (
                <div key={pt.month} className="text-center">
                  <div className="text-xs font-bold text-[#06295A]">{pt.month}</div>
                  <div className="text-[11px] font-mono-tabular text-slate-500">
                    {pt.avgDays ?? 0}d méd · {pt.totalCount} NOK
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Chart 3 (ANS Donut) + Chart 4 (Tempo por Criticidade) + Chart 5 (Tempo por Tipo) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Chart 3: Aderência ao ANS (Rosca) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <h3 className="font-display text-sm font-bold text-[#06295A]">
            ADERÊNCIA AO ANS DE CORRETIVAS
          </h3>

          <div className="my-4 flex flex-col items-center gap-4">
            <div className="relative shrink-0 w-[160px] h-[160px]">
              <svg
                viewBox={`0 0 ${ansDonutData.size} ${ansDonutData.size}`}
                className="w-full h-full -rotate-90"
              >
                <circle
                  cx={ansDonutData.size / 2}
                  cy={ansDonutData.size / 2}
                  r={ansDonutData.radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth={ansDonutData.strokeWidth}
                />
                {ansDonutData.total > 0 &&
                  ansDonutData.slices
                    .filter((s) => s.count > 0)
                    .map((slice) => {
                      const isSelected =
                        selectedAnsBucket === 'ALL' || selectedAnsBucket === slice.bucket;
                      const isHovered = hoveredAns === slice.bucket;
                      return (
                        <circle
                          key={slice.bucket}
                          cx={ansDonutData.size / 2}
                          cy={ansDonutData.size / 2}
                          r={ansDonutData.radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={
                            isHovered
                              ? ansDonutData.strokeWidth + 4
                              : ansDonutData.strokeWidth
                          }
                          strokeDasharray={`${Math.max(slice.dashLength - 1.2, 0)} ${
                            slice.gapLength + 1.2
                          }`}
                          strokeDashoffset={slice.dashOffset}
                          opacity={isSelected ? 1 : 0.3}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredAns(slice.bucket)}
                          onMouseLeave={() => setHoveredAns(null)}
                          onClick={() =>
                            setSelectedAnsBucket(
                              selectedAnsBucket === slice.bucket ? 'ALL' : slice.bucket
                            )
                          }
                        />
                      );
                    })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <span className="font-display text-2xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
                  {hoveredAns
                    ? ansDonutData.slices.find((s) => s.bucket === hoveredAns)?.count ??
                      ansDonutData.total
                    : ansDonutData.total}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-[96px]">
                  {hoveredAns ?? 'Anomalias'}
                </span>
              </div>
            </div>

            <ul className="w-full space-y-1.5">
              {ansDonutData.slices.map((slice) => {
                const active = selectedAnsBucket === slice.bucket;
                return (
                  <li key={slice.bucket}>
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredAns(slice.bucket)}
                      onMouseLeave={() => setHoveredAns(null)}
                      onClick={() =>
                        setSelectedAnsBucket(active ? 'ALL' : slice.bucket)
                      }
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
                        <span className="truncate">{slice.bucket}</span>
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

        {/* Chart 4: Tempo Médio por Criticidade (Dias vs ANS) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              TEMPO DE RESPOSTA POR CRITICIDADE
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dias médios realizados frente ao limite de ANS
            </p>
          </div>

          <div className="my-4 space-y-4 flex-1 flex flex-col justify-center">
            {analysis.byCriticality.map((c) => {
              const barPct = Math.min(100, Math.round((c.avgDays / maxCritDays) * 100));
              const ansMarkerPct = Math.min(
                100,
                Math.round((c.ansLimitDays / maxCritDays) * 100)
              );
              const active = selectedCriticality === c.criticality;
              return (
                <button
                  key={c.criticality}
                  type="button"
                  onClick={() =>
                    setSelectedCriticality(active ? 'ALL' : c.criticality)
                  }
                  className={`w-full text-left rounded-xl p-2 -mx-2 transition-colors cursor-pointer ${
                    active ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#06295A]">
                      {c.criticality}{' '}
                      <span className="font-normal text-slate-500">
                        (ANS ≤ {c.ansLimitDays}d · {c.totalCount} itens)
                      </span>
                    </span>
                    <span className="font-mono-tabular font-bold text-[#06295A]">
                      {c.avgDays.toFixed(1)}d · {c.ansPct}% ANS
                    </span>
                  </div>
                  <div className="relative h-3.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(8, barPct)}%`,
                        backgroundColor: daysColor(c.avgDays, c.ansLimitDays),
                      }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 border-l-2 border-dashed border-slate-900/60 pointer-events-none"
                      style={{ left: `${ansMarkerPct}%` }}
                      title={`Limite ANS: ${c.ansLimitDays} dia(s)`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart 5: Tempo Médio por Tipo de Anomalia */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              TEMPO MÉDIO POR TIPO DE ANOMALIA
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Principais desvios do checklist em dias para correção
            </p>
          </div>

          <div className="mt-4 space-y-2.5 flex-1">
            {analysis.byOccurrenceType.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Sem anomalias para os filtros atuais.
              </div>
            ) : (
              analysis.byOccurrenceType.map((item) => {
                const widthPct = Math.min(
                  100,
                  Math.round((item.avgDays / maxOccurrenceDays) * 100)
                );
                return (
                  <div key={item.occurrenceType} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 font-medium text-slate-700 truncate">
                      {item.occurrenceType}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(10, widthPct)}%`,
                          backgroundColor: daysColor(
                            item.avgDays,
                            savedConfig.ansImediataDays
                          ),
                        }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono-tabular font-bold text-[#06295A] shrink-0">
                      {item.avgDays.toFixed(1)}d ({item.totalCount})
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Modal: Lista de Anomalias & Registro de Tempo de Reparo */}
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
                  Anomalias dos Checklists & Tempo de Reparo ({modalFilteredRecords.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Clique em &ldquo;Atualizar&rdquo; para registrar o tempo real de correção (sincronizado com 1.3.3.4)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    placeholder="Buscar placa, item, tipo..."
                    className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs w-52"
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
                    <th className="py-2.5 px-3">Mês/Data</th>
                    <th className="py-2.5 px-2">Placa</th>
                    <th className="py-2.5 px-2">Item NOK</th>
                    <th className="py-2.5 px-2">Criticidade</th>
                    <th className="py-2.5 px-2 text-right">Tempo</th>
                    <th className="py-2.5 px-2 text-right">ANS</th>
                    <th className="py-2.5 px-2">Situação</th>
                    <th className="py-2.5 px-3 text-right">Reparo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {modalFilteredRecords.slice(0, 150).map((row) => (
                    <tr key={row.id} className="hover:bg-[#F7FAFF]">
                      <td className="py-2 px-3 font-mono-tabular text-[11px]">
                        {row.month} {row.date}
                      </td>
                      <td className="py-2 px-2 font-mono-tabular font-bold text-[#06295A]">
                        {row.plate}
                      </td>
                      <td className="py-2 px-2 max-w-[230px] truncate" title={row.itemName}>
                        <span className="font-semibold text-slate-800">{row.occurrenceType}</span>
                        <span className="text-slate-500"> · {row.itemName}</span>
                      </td>
                      <td className="py-2 px-2 font-semibold">{row.criticality}</td>
                      <td className="py-2 px-2 text-right font-mono-tabular font-bold">
                        {row.resolutionDays} d
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-500">
                        ≤ {row.ansLimitDays} d
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                            ANS_BUCKET_META[row.ansBucket].badgeClass
                          }`}
                        >
                          {row.ansBucket}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRepairRow(row);
                            setDraftRepairDays(row.resolutionDays);
                            setDraftRepairResolved(row.resolved);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-[#06295A] cursor-pointer"
                        >
                          <Wrench className="w-3 h-3 text-[#1565D8]" />
                          Atualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar / Atualizar Reparo */}
      {editingRepairRow && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setEditingRepairRow(null)}
        >
          <form
            onSubmit={handleSaveRepairOverride}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-[#06295A]">
                  Registrar Reparo — {editingRepairRow.plate}
                </h4>
                <p className="text-xs text-slate-500">
                  {editingRepairRow.itemName} ({editingRepairRow.criticality})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRepairRow(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Situação do reparo
                </label>
                <select
                  value={draftRepairResolved ? 'resolved' : 'open'}
                  onChange={(e) => setDraftRepairResolved(e.target.value === 'resolved')}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                >
                  <option value="resolved">Concluído / Corrigido</option>
                  <option value="open">Em aberto / Pendente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tempo para correção (dias) · ANS ≤ {editingRepairRow.ansLimitDays}d
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={draftRepairDays}
                  onChange={(e) => setDraftRepairDays(Number(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm font-mono-tabular font-bold text-[#06295A]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRepairRow(null)}
                className="h-9 px-3.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[#0B3C7D] hover:bg-[#06295A] text-white text-xs font-bold cursor-pointer"
              >
                Salvar Reparo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Meta & Parâmetros de ANS */}
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
              <h4 className="font-display text-base font-bold text-[#06295A]">
                Meta IV e Limites de ANS
              </h4>
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ANS Imediata (d)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={draftAnsImediata}
                    onChange={(e) => setDraftAnsImediata(Number(e.target.value) || 1)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono-tabular font-bold text-[#06295A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ANS Alta (d)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={draftAnsAlta}
                    onChange={(e) => setDraftAnsAlta(Number(e.target.value) || 3)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono-tabular font-bold text-[#06295A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ANS Média (d)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={draftAnsMedia}
                    onChange={(e) => setDraftAnsMedia(Number(e.target.value) || 5)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono-tabular font-bold text-[#06295A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsável pelo Monitoramento
                </label>
                <input
                  type="text"
                  value={draftAuditor}
                  onChange={(e) => setDraftAuditor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800"
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
                Salvar Parâmetros
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
