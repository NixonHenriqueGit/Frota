import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FilterX,
  Pencil,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SquareCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  Vehicle,
} from '../types/fleet';
import { STRATIFIED_MONTHS } from '../data/problemStratification';
import {
  DTO_CONFIG_ID,
  DTO_CONFIG_MIME,
  DTO_ID_PREFIX,
  DTO_REASON_OPTIONS,
  DTO_STEPS,
  DtoActionBand,
  DtoConfig,
  DtoOperation,
  DtoRecordPayload,
  DtoStepAnswer,
  DtoStepResponse,
  buildDtoConfigRecord,
  buildDtoLegalizedRecord,
  computeDtoAnalysis,
  computeDtoScoreAndAction,
  inferDtoMonthFromDate,
  inferDtoOperation,
  parseDtoConfig,
  parseDtoRecords,
} from '../data/dtoChecklist';

interface DtoViewProps {
  vehicles: Vehicle[];
  dtoDocs: LegalizedDocumentRecord[];
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

type DraftStepMap = Record<string, { answer: DtoStepAnswer | null; observation: string }>;

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToBrDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return new Date().toLocaleDateString('pt-BR');
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function brToIsoDate(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  if (!m) return todayIsoDate();
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatDurationMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function createBlankDraftSteps(): DraftStepMap {
  const map: DraftStepMap = {};
  for (const step of DTO_STEPS) {
    map[step.id] = { answer: null, observation: '' };
  }
  return map;
}

function scoreBarGradient(score: number): string {
  if (score === 100) return 'linear-gradient(180deg, #2563EB 0%, #0B3C7D 100%)';
  if (score >= 80) return 'linear-gradient(180deg, #3B82F6 0%, #1565D8 100%)';
  return 'linear-gradient(180deg, #60A5FA 0%, #1E40AF 100%)';
}

function actionBadgeClass(band: DtoActionBand): string {
  if (band === 'Reconhecimento da equipe') {
    return 'bg-blue-50 text-[#1565D8] border-blue-200';
  }
  if (band === 'Dar feedback e realizar nova DTO em mais 1 blitz') {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  return 'bg-slate-100 text-[#06295A] border-slate-300';
}

function shortActionLabel(band: DtoActionBand): string {
  if (band === 'Reconhecimento da equipe') return 'Reconhecimento (100%)';
  if (band === 'Dar feedback e realizar nova DTO em mais 1 blitz') {
    return 'Feedback + 1 blitz (80–99%)';
  }
  return 'Refazer treinamento (<80%)';
}

export const DtoView: React.FC<DtoViewProps> = ({
  vehicles,
  dtoDocs,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const savedConfig = useMemo(() => parseDtoConfig(dtoDocs), [dtoDocs]);
  const allRecords = useMemo(() => parseDtoRecords(dtoDocs), [dtoDocs]);

  const [activeTab, setActiveTab] = useState<'analises' | 'realizar'>('analises');

  // Guided Process State: 'idle' (step 1: abrir/iniciar) | 'running' (step 2: executando checklist)
  const [processStage, setProcessStage] = useState<'idle' | 'running'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Header Fields (Data, Responsável DTO, Motivo DTO, Motorista, Veículo)
  const [formDateIso, setFormDateIso] = useState<string>(todayIsoDate());
  const [formResponsible, setFormResponsible] = useState<string>('');
  const [formReason, setFormReason] = useState<string>(DTO_REASON_OPTIONS[0]);
  const [formDriver, setFormDriver] = useState<string>('');
  const [formVehiclePlate, setFormVehiclePlate] = useState<string>('');
  const [formCustomVehicle, setFormCustomVehicle] = useState<string>('');
  const [formOperation, setFormOperation] = useState<DtoOperation>('Entrega');
  const [formSteps, setFormSteps] = useState<DraftStepMap>(() =>
    createBlankDraftSteps()
  );
  const [formGeneralObservation, setFormGeneralObservation] = useState<string>('');
  const [showUnansweredAlert, setShowUnansweredAlert] = useState<boolean>(false);

  // Filters (Análises & Histórico)
  const [selectedMonth, setSelectedMonth] = useState<StratifiedMonthShort | 'ALL'>('ALL');
  const [selectedOperation, setSelectedOperation] = useState<DtoOperation | 'ALL'>('ALL');
  const [selectedLeader, setSelectedLeader] = useState<string>('ALL');
  const [selectedBand, setSelectedBand] = useState<DtoActionBand | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');

  // Modals
  const [detailRecord, setDetailRecord] = useState<DtoRecordPayload | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [draftMonthlyTarget, setDraftMonthlyTarget] = useState<number>(
    savedConfig.monthlyTargetCount
  );
  const [draftTargetScore, setDraftTargetScore] = useState<number>(
    savedConfig.targetScorePct
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Live timer while processStage === 'running'
  useEffect(() => {
    if (processStage !== 'running' || startedAtMs === null || editingId !== null) {
      return;
    }
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [processStage, startedAtMs, editingId]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const leaderOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRecords) {
      if (r.responsible.trim()) set.add(r.responsible.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allRecords.filter((r) => {
      if (selectedMonth !== 'ALL' && r.month !== selectedMonth) return false;
      if (selectedOperation !== 'ALL' && r.operation !== selectedOperation) return false;
      if (selectedLeader !== 'ALL' && r.responsible.trim() !== selectedLeader) {
        return false;
      }
      if (selectedBand !== 'ALL' && r.actionBand !== selectedBand) return false;
      if (q) {
        const hay = `${r.driver} ${r.responsible} ${r.vehiclePlate} ${r.vehicleLabel} ${r.reason}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allRecords,
    selectedMonth,
    selectedOperation,
    selectedLeader,
    selectedBand,
    searchText,
  ]);

  const recordsForMonthlyChart = useMemo(() => {
    return allRecords.filter((r) => {
      if (selectedOperation !== 'ALL' && r.operation !== selectedOperation) return false;
      if (selectedLeader !== 'ALL' && r.responsible.trim() !== selectedLeader) {
        return false;
      }
      if (selectedBand !== 'ALL' && r.actionBand !== selectedBand) return false;
      return true;
    });
  }, [allRecords, selectedOperation, selectedLeader, selectedBand]);

  const analysis = useMemo(() => {
    const base = computeDtoAnalysis(filteredRecords, savedConfig);
    const monthlyBase = computeDtoAnalysis(recordsForMonthlyChart, savedConfig);
    return {
      ...base,
      monthlySeries: monthlyBase.monthlySeries,
    };
  }, [filteredRecords, recordsForMonthlyChart, savedConfig]);

  const donutData = useMemo(() => {
    const size = 166;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = analysis.totalCount;
    let cumulative = 0;

    const slices = analysis.actionDistribution.map((item) => {
      const pctFloat = total > 0 ? item.count / total : 0;
      const dashLength = pctFloat * circumference;
      const gapLength = circumference - dashLength;
      const dashOffset = -cumulative * circumference;
      cumulative += pctFloat;
      return {
        ...item,
        dashLength,
        gapLength,
        dashOffset,
      };
    });

    return { size, strokeWidth, radius, total, slices };
  }, [analysis.actionDistribution, analysis.totalCount]);

  const liveFormMetrics = useMemo(() => {
    let answeredCount = 0;
    let simCount = 0;
    let naoCount = 0;
    for (const def of DTO_STEPS) {
      const ans = formSteps[def.id]?.answer;
      if (ans === 'SIM') {
        answeredCount += 1;
        simCount += 1;
      } else if (ans === 'NAO') {
        answeredCount += 1;
        naoCount += 1;
      }
    }
    const scorePct = Math.round((simCount / DTO_STEPS.length) * 100);
    const elapsedMin = Math.floor(elapsedSeconds / 60);
    const blitzAbove30 = elapsedSeconds > 30 * 60;
    const actionBand: DtoActionBand =
      scorePct === 100
        ? 'Reconhecimento da equipe'
        : scorePct >= 80
          ? 'Dar feedback e realizar nova DTO em mais 1 blitz'
          : 'Refazer treinamento';

    return {
      answeredCount,
      simCount,
      naoCount,
      scorePct,
      elapsedMin,
      blitzAbove30,
      actionBand,
      allAnswered: answeredCount === DTO_STEPS.length,
    };
  }, [formSteps, elapsedSeconds]);

  const resolvedPlateDisplay = useMemo(() => {
    if (formVehiclePlate === '__CUSTOM__') {
      return formCustomVehicle.trim().toUpperCase() || '—';
    }
    const matched = vehicles.find((v) => v.plate === formVehiclePlate);
    return matched ? `${matched.plate} · ${matched.model}` : formVehiclePlate || '—';
  }, [formVehiclePlate, formCustomVehicle, vehicles]);

  const hasFilters =
    selectedMonth !== 'ALL' ||
    selectedOperation !== 'ALL' ||
    selectedLeader !== 'ALL' ||
    selectedBand !== 'ALL' ||
    searchText.trim().length > 0;

  const clearFilters = () => {
    setSelectedMonth('ALL');
    setSelectedOperation('ALL');
    setSelectedLeader('ALL');
    setSelectedBand('ALL');
    setSearchText('');
  };

  const resetProcess = () => {
    setProcessStage('idle');
    setEditingId(null);
    setStartedAtMs(null);
    setElapsedSeconds(0);
    setFormDateIso(todayIsoDate());
    setFormResponsible('');
    setFormReason(DTO_REASON_OPTIONS[0]);
    setFormDriver('');
    setFormVehiclePlate('');
    setFormCustomVehicle('');
    setFormOperation('Entrega');
    setFormSteps(createBlankDraftSteps());
    setFormGeneralObservation('');
    setShowUnansweredAlert(false);
  };

  const openStartDtoFlow = () => {
    if (processStage === 'running') {
      setActiveTab('realizar');
      return;
    }
    resetProcess();
    setActiveTab('realizar');
  };

  const handleStartDto = (e: React.FormEvent) => {
    e.preventDefault();
    const plate =
      formVehiclePlate === '__CUSTOM__'
        ? formCustomVehicle.trim().toUpperCase()
        : formVehiclePlate.trim().toUpperCase();
    if (!formResponsible.trim() || !formDriver.trim() || !plate) {
      showNotice('Preencha Responsável DTO, Motorista e Veículo para iniciar o DTO.');
      return;
    }
    setStartedAtMs(Date.now());
    setElapsedSeconds(0);
    setProcessStage('running');
    setShowUnansweredAlert(false);
  };

  const startEditDto = (rec: DtoRecordPayload) => {
    setEditingId(rec.id);
    setFormDateIso(brToIsoDate(rec.date));
    setFormResponsible(rec.responsible);
    setFormReason(rec.reason);
    setFormDriver(rec.driver);
    const matchedVeh = vehicles.find(
      (v) => v.plate.toUpperCase() === rec.vehiclePlate.toUpperCase()
    );
    if (matchedVeh) {
      setFormVehiclePlate(matchedVeh.plate);
      setFormCustomVehicle('');
    } else {
      setFormVehiclePlate('__CUSTOM__');
      setFormCustomVehicle(rec.vehiclePlate);
    }
    setFormOperation(rec.operation);
    setElapsedSeconds(
      typeof rec.durationSeconds === 'number'
        ? rec.durationSeconds
        : (rec.blitzDurationMin ?? 0) * 60
    );
    setStartedAtMs(null);
    const cloned: DraftStepMap = {};
    for (const def of DTO_STEPS) {
      cloned[def.id] = {
        answer: rec.steps[def.id]?.answer ?? 'SIM',
        observation: rec.steps[def.id]?.observation ?? '',
      };
    }
    setFormSteps(cloned);
    setFormGeneralObservation(rec.generalObservation ?? '');
    setShowUnansweredAlert(false);
    setProcessStage('running');
    setDetailRecord(null);
    setActiveTab('realizar');
  };

  const handleVehicleSelect = (val: string) => {
    setFormVehiclePlate(val);
    if (val && val !== '__CUSTOM__') {
      setFormOperation(inferDtoOperation(val, vehicles));
    }
  };

  const handleStepAnswer = (stepId: string, answer: DtoStepAnswer) => {
    setFormSteps((prev) => ({
      ...prev,
      [stepId]: {
        answer,
        observation: prev[stepId]?.observation ?? '',
      },
    }));
  };

  const handleStepObservation = (stepId: string, observation: string) => {
    setFormSteps((prev) => ({
      ...prev,
      [stepId]: {
        answer: prev[stepId]?.answer ?? null,
        observation,
      },
    }));
  };

  const handleMarkAllSteps = (answer: DtoStepAnswer) => {
    setFormSteps((prev) => {
      const next: DraftStepMap = {};
      for (const def of DTO_STEPS) {
        next[def.id] = {
          answer,
          observation: prev[def.id]?.observation ?? '',
        };
      }
      return next;
    });
    setShowUnansweredAlert(false);
  };

  const handleFinishDto = () => {
    if (!liveFormMetrics.allAnswered) {
      setShowUnansweredAlert(true);
      showNotice(
        `Faltam ${DTO_STEPS.length - liveFormMetrics.answeredCount} passo(s) para responder antes de finalizar o DTO.`
      );
      return;
    }

    const responsible = formResponsible.trim();
    const driver = formDriver.trim();
    const plate =
      formVehiclePlate === '__CUSTOM__'
        ? formCustomVehicle.trim().toUpperCase()
        : formVehiclePlate.trim().toUpperCase();

    if (!responsible || !driver || !plate) {
      showNotice('Verifique Responsável DTO, Motorista e Veículo antes de finalizar.');
      return;
    }

    const finalSteps: Record<string, DtoStepResponse> = {};
    for (const def of DTO_STEPS) {
      finalSteps[def.id] = {
        answer: formSteps[def.id]?.answer === 'NAO' ? 'NAO' : 'SIM',
        observation: formSteps[def.id]?.observation ?? '',
      };
    }

    const matchedVeh = vehicles.find((v) => v.plate.toUpperCase() === plate);
    const vehicleLabel = matchedVeh
      ? `${matchedVeh.plate} · ${matchedVeh.model}`
      : plate;

    const brDate = isoToBrDate(formDateIso);
    const month = inferDtoMonthFromDate(brDate);
    const durationSecs =
      editingId !== null
        ? elapsedSeconds
        : startedAtMs !== null
          ? Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000))
          : elapsedSeconds;
    const durationMins = Math.round(durationSecs / 60);
    const computed = computeDtoScoreAndAction(finalSteps, durationMins);

    const existingRecord = editingId
      ? allRecords.find((r) => r.id === editingId)
      : undefined;

    const recordId =
      editingId ??
      `${DTO_ID_PREFIX}${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

    const payload: DtoRecordPayload = {
      id: recordId,
      date: brDate,
      month,
      responsible,
      reason: formReason.trim() || DTO_REASON_OPTIONS[0],
      driver,
      vehiclePlate: plate,
      vehicleLabel,
      operation: formOperation,
      startedAtIso:
        existingRecord?.startedAtIso ??
        (startedAtMs ? new Date(startedAtMs).toISOString() : new Date().toISOString()),
      finishedAtIso: new Date().toISOString(),
      durationSeconds: durationSecs,
      blitzDurationMin: durationMins,
      steps: finalSteps,
      simCount: computed.simCount,
      scorePct: computed.scorePct,
      actionBand: computed.actionBand,
      blitzAbove30: durationSecs > 30 * 60,
      generalObservation: formGeneralObservation.trim(),
      createdAtIso: existingRecord?.createdAtIso || new Date().toISOString(),
    };

    const docRecord = buildDtoLegalizedRecord(payload);
    const existingDoc = dtoDocs.find((d) => d.id === docRecord.id);
    if (existingDoc) {
      onUpdateRecord(existingDoc.id, docRecord);
      showNotice(
        `DTO de ${driver} (${plate}) atualizado: ${computed.scorePct}% · ${computed.actionBand}.`
      );
    } else {
      onAddRecords([docRecord]);
      showNotice(
        `DTO finalizado para ${driver} (${plate}): ${computed.scorePct}% · ${computed.actionBand}.`
      );
    }

    resetProcess();
    setActiveTab('analises');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const nextConfig: DtoConfig = {
      monthlyTargetCount: Math.max(1, Math.round(draftMonthlyTarget) || 10),
      targetScorePct: Math.min(100, Math.max(50, Math.round(draftTargetScore) || 80)),
      updatedAt: new Date().toLocaleDateString('pt-BR'),
    };
    const rec = buildDtoConfigRecord(nextConfig);
    const existing = dtoDocs.find(
      (d) => d.id === DTO_CONFIG_ID || d.fileType === DTO_CONFIG_MIME
    );
    if (existing) {
      onUpdateRecord(existing.id, rec);
    } else {
      onAddRecords([rec]);
    }
    setConfigModalOpen(false);
    showNotice(
      `Meta mensal (${nextConfig.monthlyTargetCount} DTOs) e meta de pontuação (${nextConfig.targetScorePct}%) salvas.`
    );
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          Indicador: 'Total de DTOs realizados',
          Valor: analysis.totalCount,
          Meta: `${savedConfig.monthlyTargetCount}/mês`,
        },
        {
          Indicador: 'Pontuação Média Equipe (%)',
          Valor: `${analysis.avgScorePct}%`,
          Meta: `${savedConfig.targetScorePct}%`,
        },
        {
          Indicador: 'DTOs com 100% (Reconhecimento)',
          Valor: analysis.perfectCount,
          Meta: '-',
        },
        {
          Indicador: 'DTOs 80% a 99% (Feedback + 1 blitz)',
          Valor: analysis.feedbackCount,
          Meta: '-',
        },
        {
          Indicador: 'DTOs Abaixo de 80% (Refazer treinamento)',
          Valor: analysis.retrainCount,
          Meta: '0',
        },
        {
          Indicador: 'Blitz acima de 30 min',
          Valor: analysis.blitzAbove30Count,
          Meta: '0',
        },
      ]),
      'Resumo DTO'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        filteredRecords.map((r) => ({
          Data: r.date,
          Mes: r.month,
          Responsavel_DTO: r.responsible,
          Motivo_DTO: r.reason,
          Motorista: r.driver,
          Veiculo: r.vehicleLabel,
          Operacao: r.operation,
          Duracao: r.durationSeconds
            ? formatDurationMMSS(r.durationSeconds)
            : `${r.blitzDurationMin ?? 0} min`,
          SIM: r.simCount,
          NAO: 19 - r.simCount,
          Pontuacao_Pct: `${r.scorePct}%`,
          Acao_Recomendada: r.actionBand,
          Blitz_Acima_30min: r.blitzAbove30 ? 'Sim' : 'Não',
          Observacao_Geral: r.generalObservation ?? '',
        }))
      ),
      'DTOs Realizados'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.stepDeviations.map((s) => ({
          Passo: s.number,
          Descricao: s.label,
          Qtd_SIM: s.simCount,
          Qtd_NAO: s.naoCount,
          Conformidade_Pct: `${s.conformityPct}%`,
        }))
      ),
      'Analise por Passo'
    );

    XLSX.writeFile(wb, '1.3.9_DTO_Checklist_Frota.xlsx');
    showNotice('Planilha de DTO exportada com sucesso.');
  };

  return (
    <div className="space-y-4">
      {/* Header & Tab Switcher */}
      <section className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#06295A]">
              1.3.9 DTO — Checklist Frota & Análises
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fluxo completo do Diálogo Técnico Operacional (Iniciar DTO → Checklist 19 passos → Finalizar e Analisar)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#EAF1FA] border border-[#D6E2F2]">
              <button
                type="button"
                onClick={() => setActiveTab('analises')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'analises'
                    ? 'bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#06295A]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Análises e Histórico ({allRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('realizar')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'realizar'
                    ? 'bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#06295A]'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                {processStage === 'running' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>DTO em andamento</span>
                    <span className="font-mono-tabular px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
                      {formatDurationMMSS(elapsedSeconds)}
                    </span>
                  </span>
                ) : (
                  'Realizar DTO'
                )}
              </button>
            </div>

            {activeTab === 'analises' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraftMonthlyTarget(savedConfig.monthlyTargetCount);
                    setDraftTargetScore(savedConfig.targetScorePct);
                    setConfigModalOpen(true);
                  }}
                  className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#1565D8]" />
                  Meta Mensal
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#06295A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#1565D8]" />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={openStartDtoFlow}
                  className="h-9 px-4 rounded-xl bg-[#0B3C7D] hover:bg-[#06295A] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  {processStage === 'running' ? 'Continuar DTO' : 'Iniciar DTO'}
                </button>
              </>
            )}
          </div>
        </div>

        {notice && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-[#1565D8]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </section>

      {/* TAB 1: REALIZAR DTO (PROCESSO INICIAR -> CHECKLIST -> FINALIZAR) */}
      {activeTab === 'realizar' && (
        <div className="space-y-4">
          {/* Guided Process Stepper */}
          <section className="bg-white rounded-2xl border border-slate-200/90 px-5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
              <div
                className={`inline-flex items-center gap-2 font-bold ${
                  processStage === 'idle' ? 'text-[#1565D8]' : 'text-[#06295A]'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-mono-tabular ${
                    processStage === 'idle'
                      ? 'bg-[#1565D8] text-white'
                      : 'bg-blue-100 text-[#1565D8]'
                  }`}
                >
                  {processStage === 'running' ? '✓' : '1'}
                </span>
                <span>1. Abertura &amp; Iniciar DTO</span>
              </div>

              <span className="text-slate-300">→</span>

              <div
                className={`inline-flex items-center gap-2 font-bold ${
                  processStage === 'running' ? 'text-[#1565D8]' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-mono-tabular ${
                    processStage === 'running'
                      ? 'bg-[#1565D8] text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  2
                </span>
                <span>2. Execução DTO — Checklist Frota (19 passos)</span>
              </div>

              <span className="text-slate-300">→</span>

              <div className="inline-flex items-center gap-2 font-bold text-slate-400">
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-mono-tabular bg-slate-100 text-slate-400">
                  3
                </span>
                <span>3. Finalizar &amp; Registrar Análise</span>
              </div>
            </div>

            {processStage === 'running' && (
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold font-mono-tabular ${
                    liveFormMetrics.blitzAbove30
                      ? 'bg-blue-100 border-[#06295A] text-[#06295A]'
                      : 'bg-blue-50 border-blue-200 text-[#1565D8]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tempo: {formatDurationMMSS(elapsedSeconds)}</span>
                  {liveFormMetrics.blitzAbove30 && (
                    <span className="text-[11px] ml-1">(&gt;30 min)</span>
                  )}
                </span>
              </div>
            )}
          </section>

          {/* STAGE 1: INICIAR DTO */}
          {processStage === 'idle' ? (
            <form
              onSubmit={handleStartDto}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200 bg-[#F8FAFD] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-extrabold text-[#06295A]">
                    DTO - CHECKLIST FROTA · Abertura do Processo
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Preencha os dados do cabeçalho e clique em &ldquo;Iniciar DTO&rdquo; para abrir os 19 passos e iniciar a contagem de tempo
                  </p>
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#1565D8]">
                  ABInBev · DPO
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#06295A] mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDateIso}
                      onChange={(e) => setFormDateIso(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#06295A] mb-1">
                      Responsável DTO *
                    </label>
                    <input
                      type="text"
                      required
                      value={formResponsible}
                      onChange={(e) => setFormResponsible(e.target.value)}
                      placeholder="Nome do líder / supervisor aplicador"
                      list="dto-leaders-datalist"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                    />
                    <datalist id="dto-leaders-datalist">
                      {leaderOptions.map((l) => (
                        <option key={l} value={l} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#06295A] mb-1">
                      Motivo DTO *
                    </label>
                    <input
                      type="text"
                      required
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      list="dto-reasons-datalist"
                      placeholder="Ex.: DTO Mensal, Blitz, Reciclagem..."
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                    />
                    <datalist id="dto-reasons-datalist">
                      {DTO_REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#06295A] mb-1">
                      Motorista *
                    </label>
                    <input
                      type="text"
                      required
                      value={formDriver}
                      onChange={(e) => setFormDriver(e.target.value)}
                      placeholder="Nome do motorista ou operador"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#06295A] mb-1">
                      Veículo *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        required={formVehiclePlate !== '__CUSTOM__'}
                        value={formVehiclePlate}
                        onChange={(e) => handleVehicleSelect(e.target.value)}
                        className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                      >
                        <option value="">Selecione a placa ou equipamento...</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.plate}>
                            {v.plate} — {v.model} ({v.sector})
                          </option>
                        ))}
                        <option value="__CUSTOM__">Outro / Digitar placa manualmente</option>
                      </select>
                      {formVehiclePlate === '__CUSTOM__' && (
                        <input
                          type="text"
                          required
                          value={formCustomVehicle}
                          onChange={(e) => setFormCustomVehicle(e.target.value)}
                          placeholder="Placa / código"
                          className="sm:w-40 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold uppercase text-[#06295A]"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#06295A] mb-1">
                      Operação
                    </label>
                    <select
                      value={formOperation}
                      onChange={(e) => setFormOperation(e.target.value as DtoOperation)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="Entrega">Entrega</option>
                      <option value="Puxada">Puxada</option>
                      <option value="Armazém">Armazém (Empilhadeira)</option>
                      <option value="Frota Leve">Frota Leve</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Ao iniciar, o cronômetro acompanhará a duração da blitz/DTO para validar o critério de 30 minutos.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('analises')}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Voltar às Análises
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] hover:brightness-110 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Iniciar DTO
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* STAGE 2: EXECUÇÃO DO DTO - CHECKLIST FROTA (FIEL À PLANILHA) */
            <div className="bg-white rounded-2xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.05)] overflow-hidden">
              {/* Official Form Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-300 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="font-display text-lg sm:text-2xl font-extrabold text-[#06295A] tracking-tight">
                      DTO - CHECKLIST FROTA
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#1565D8]">
                      <span>
                        Progresso: {liveFormMetrics.answeredCount}/19 passos
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>
                        Pontuação atual: {liveFormMetrics.scorePct}% ({liveFormMetrics.simCount} SIM)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div className="px-3 py-1 rounded-lg bg-[#EAF1FA] border border-[#CFE0F5]">
                      <div className="text-[11px] font-extrabold text-[#06295A] tracking-wider">
                        ABInBev · DPO
                      </div>
                      <div className="text-[10px] font-medium text-slate-500">
                        DISTRIBUTION PROCESS OPTIMISATION
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5 Lined Header Fields matching the paper/spreadsheet form */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-300 py-1 min-w-0">
                    <span className="font-bold text-slate-700 w-28 sm:w-32 shrink-0">Data:</span>
                    <span className="font-semibold text-[#06295A] font-mono-tabular truncate">
                      {isoToBrDate(formDateIso)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-b border-slate-300 py-1 min-w-0">
                    <span className="font-bold text-slate-700 w-28 sm:w-32 shrink-0">
                      Responsável DTO:
                    </span>
                    <span className="font-semibold text-[#06295A] truncate">
                      {formResponsible}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-b border-slate-300 py-1 min-w-0">
                    <span className="font-bold text-slate-700 w-28 sm:w-32 shrink-0">
                      Motivo DTO:
                    </span>
                    <span className="font-semibold text-[#06295A] truncate">
                      {formReason}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-b border-slate-300 py-1 min-w-0">
                    <span className="font-bold text-slate-700 w-28 sm:w-32 shrink-0">
                      Motorista:
                    </span>
                    <span className="font-semibold text-[#06295A] truncate">
                      {formDriver}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-b border-slate-300 py-1 md:col-span-2 min-w-0">
                    <span className="font-bold text-slate-700 w-28 sm:w-32 shrink-0">
                      Veículo:
                    </span>
                    <span className="font-semibold text-[#06295A] truncate">
                      {resolvedPlateDisplay} ({formOperation})
                    </span>
                  </div>
                </div>

                {/* Quick Helpers */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    Marque <strong>SIM</strong> (espaço em branco) ou <strong>NÃO</strong> (coluna cinza) para cada um dos 19 passos abaixo:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAllSteps('SIM')}
                      className="px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#1565D8] text-xs font-semibold cursor-pointer"
                    >
                      Marcar todos SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormSteps(createBlankDraftSteps());
                        setShowUnansweredAlert(false);
                      }}
                      className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Limpar marcações
                    </button>
                  </div>
                </div>

                {showUnansweredAlert && !liveFormMetrics.allAnswered && (
                  <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Existem {DTO_STEPS.length - liveFormMetrics.answeredCount} passo(s) sem marcação (destacados abaixo). Marque SIM ou NÃO em todos os 19 passos para finalizar.
                    </span>
                  </div>
                )}
              </div>

              {/* Mobile View: Stacked Touch-Friendly Cards (no horizontal cutoff) */}
              <div className="md:hidden divide-y divide-slate-200 border-t border-slate-200">
                {DTO_STEPS.map((step) => {
                  const curr = formSteps[step.id] ?? { answer: null, observation: '' };
                  const isSim = curr.answer === 'SIM';
                  const isNao = curr.answer === 'NAO';
                  const missing = showUnansweredAlert && curr.answer === null;

                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 space-y-2.5 ${
                        missing ? 'bg-amber-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[#EAF1FA] border border-[#CFE0F5] text-[#06295A] font-mono-tabular text-xs font-extrabold inline-flex items-center justify-center shrink-0 mt-0.5">
                          {step.number}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {step.label}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          aria-label={`Passo ${step.number} SIM`}
                          onClick={() => handleStepAnswer(step.id, 'SIM')}
                          className={`h-9 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                            isSim
                              ? 'bg-[#1565D8] border-[#1565D8] text-white shadow-sm'
                              : 'bg-white border-slate-300 text-slate-600'
                          }`}
                        >
                          {isSim && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>SIM</span>
                        </button>

                        <button
                          type="button"
                          aria-label={`Passo ${step.number} NÃO`}
                          onClick={() => handleStepAnswer(step.id, 'NAO')}
                          className={`h-9 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                            isNao
                              ? 'bg-[#06295A] border-[#06295A] text-white shadow-sm'
                              : 'bg-[#5A606B] border-[#5A606B] text-white/90'
                          }`}
                        >
                          {isNao && <X className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>NÃO</span>
                        </button>
                      </div>

                      <input
                        type="text"
                        value={curr.observation}
                        onChange={(e) => handleStepObservation(step.id, e.target.value)}
                        placeholder={
                          isNao ? 'Descreva o desvio encontrado...' : 'Observação (opcional)...'
                        }
                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Exact 19-Step Checklist Table matching the image */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-200/80 border-y border-slate-300 text-xs font-bold text-slate-800">
                      <th className="py-2 px-3 w-12 text-center border-r border-slate-300">
                        #
                      </th>
                      <th className="py-2 px-3 text-center border-r border-slate-300">
                        Passo
                      </th>
                      <th className="py-2 px-2 w-20 text-center border-r border-slate-300">
                        SIM
                      </th>
                      <th className="py-2 px-2 w-20 text-center border-r border-slate-300">
                        NÃO
                      </th>
                      <th className="py-2 px-3 min-w-[230px] text-center">
                        Observação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {DTO_STEPS.map((step) => {
                      const curr = formSteps[step.id] ?? { answer: null, observation: '' };
                      const isSim = curr.answer === 'SIM';
                      const isNao = curr.answer === 'NAO';
                      const missing = showUnansweredAlert && curr.answer === null;

                      return (
                        <tr
                          key={step.id}
                          className={`border-b border-slate-300 ${
                            missing ? 'bg-amber-50/70' : 'bg-white'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-[#06295A] border-r border-slate-300">
                            {step.number}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-300 leading-snug">
                            {step.label}
                          </td>
                          {/* SIM column: white background ("espaço em branco") */}
                          <td className="p-1.5 text-center bg-white border-r border-slate-300">
                            <button
                              type="button"
                              aria-label={`Passo ${step.number} SIM`}
                              onClick={() => handleStepAnswer(step.id, 'SIM')}
                              className={`w-full h-8 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                isSim
                                  ? 'bg-[#1565D8] border-[#1565D8] text-white font-bold shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-300 hover:border-[#1565D8] hover:text-[#1565D8]'
                              }`}
                            >
                              {isSim ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span className="text-[10px] font-semibold">SIM</span>
                              )}
                            </button>
                          </td>
                          {/* NÃO column: shaded dark grey matching the sheet */}
                          <td className="p-1.5 text-center bg-[#5A606B] border-r border-slate-300">
                            <button
                              type="button"
                              aria-label={`Passo ${step.number} NÃO`}
                              onClick={() => handleStepAnswer(step.id, 'NAO')}
                              className={`w-full h-8 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                isNao
                                  ? 'bg-[#06295A] border-white text-white font-bold shadow-sm'
                                  : 'bg-[#5A606B] border-slate-400/50 text-slate-300/70 hover:bg-[#4B515B] hover:text-white'
                              }`}
                            >
                              {isNao ? (
                                <X className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span className="text-[10px] font-semibold">NÃO</span>
                              )}
                            </button>
                          </td>
                          <td className="p-1.5 bg-white">
                            <input
                              type="text"
                              value={curr.observation}
                              onChange={(e) => handleStepObservation(step.id, e.target.value)}
                              placeholder={
                                isNao ? 'Descreva o desvio encontrado...' : 'Observação...'
                              }
                              className="w-full h-8 rounded-md border border-slate-200 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Exact Pontuação Equipe (%) Footer matching the spreadsheet */}
              <div className="border-t-2 border-slate-400 grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-6 bg-slate-200/80 px-5 py-4 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-r border-slate-300">
                  <div className="font-display text-lg font-extrabold text-slate-900">
                    Pontuação Equipe (%):
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    (cada espaço em branco vale 1 ponto, somar os espaços em branco e dividir por 19)
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white px-4 py-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-300">
                  <span className="font-display text-3xl font-extrabold font-mono-tabular text-[#1565D8]">
                    {liveFormMetrics.scorePct}%
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-500 mt-0.5">
                    {liveFormMetrics.simCount} / 19 SIM
                  </span>
                </div>

                <div className="lg:col-span-4 bg-white divide-y divide-slate-200 text-xs">
                  <div
                    className={`px-3 py-2 transition-colors ${
                      liveFormMetrics.scorePct === 100 && liveFormMetrics.allAnswered
                        ? 'bg-blue-50 text-[#06295A] font-extrabold'
                        : 'text-slate-700'
                    }`}
                  >
                    100% ► Reconhecimento da equipe
                  </div>
                  <div
                    className={`px-3 py-2 transition-colors ${
                      liveFormMetrics.scorePct >= 80 &&
                      liveFormMetrics.scorePct < 100 &&
                      liveFormMetrics.allAnswered
                        ? 'bg-sky-50 text-[#06295A] font-extrabold'
                        : 'text-slate-700'
                    }`}
                  >
                    Entre 80% e 100% ► Dar feedback e realizar nova DTO em mais 1 blitz
                  </div>
                  <div
                    className={`px-3 py-2 transition-colors ${
                      liveFormMetrics.scorePct < 80 && liveFormMetrics.allAnswered
                        ? 'bg-slate-200 text-[#06295A] font-extrabold'
                        : 'text-slate-700'
                    }`}
                  >
                    Abaixo de 80% ► Refazer treinamento
                  </div>
                  <div
                    className={`px-3 py-2 transition-colors ${
                      liveFormMetrics.blitzAbove30
                        ? 'bg-blue-100 text-[#06295A] font-extrabold'
                        : 'text-slate-700'
                    }`}
                  >
                    Blitz acima de 30 ► Fazer tempos e movimentos da blitz
                  </div>
                </div>
              </div>

              {/* General Observation + Finish Process Footer */}
              <div className="p-5 bg-[#F8FAFD] border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Observação Geral / Combinados do Feedback (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formGeneralObservation}
                    onChange={(e) => setFormGeneralObservation(e.target.value)}
                    placeholder="Anote aqui o feedback dado ao condutor ou ações combinadas..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/30"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetProcess();
                      setActiveTab('analises');
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Cancelar DTO
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishDto}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] hover:brightness-110 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <SquareCheck className="w-4 h-4" />
                    {editingId ? 'Finalizar Edição do DTO' : 'Finalizar DTO'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANÁLISES & HISTÓRICO */}
      {activeTab === 'analises' && (
        <>
          {/* Filter Bar */}
          <section className="bg-white rounded-2xl border border-slate-200/90 px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por Operação"
                value={selectedOperation}
                onChange={(e) =>
                  setSelectedOperation(e.target.value as DtoOperation | 'ALL')
                }
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Todas operações</option>
                <option value="Entrega">Entrega</option>
                <option value="Puxada">Puxada</option>
                <option value="Armazém">Armazém</option>
                <option value="Frota Leve">Frota Leve</option>
                <option value="Geral">Geral</option>
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

              <select
                aria-label="Filtrar por Responsável"
                value={selectedLeader}
                onChange={(e) => setSelectedLeader(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Todos responsáveis</option>
                {leaderOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por Classificação"
                value={selectedBand}
                onChange={(e) =>
                  setSelectedBand(e.target.value as DtoActionBand | 'ALL')
                }
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Todas classificações</option>
                <option value="Reconhecimento da equipe">100% · Reconhecimento</option>
                <option value="Dar feedback e realizar nova DTO em mais 1 blitz">
                  80%–99% · Feedback + 1 blitz
                </option>
                <option value="Refazer treinamento">&lt; 80% · Refazer treinamento</option>
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 px-3 rounded-xl border border-blue-200 bg-blue-50 text-[#1565D8] hover:bg-blue-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar motorista, placa, líder..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 text-xs text-slate-700"
              />
            </div>
          </section>

          {/* 4 KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="font-display text-3xl font-extrabold font-mono-tabular leading-none text-[#0B3C7D]">
                {analysis.totalCount}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1.5">
                DTOs realizados (Meta {savedConfig.monthlyTargetCount}/mês)
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="font-display text-3xl font-extrabold font-mono-tabular leading-none text-[#1565D8]">
                {analysis.avgScorePct}%
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1.5">
                Pontuação média da equipe (Meta {savedConfig.targetScorePct}%)
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="font-display text-3xl font-extrabold font-mono-tabular leading-none text-[#06295A]">
                {analysis.perfectCount}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1.5">
                100% Reconhecimento · {analysis.uniqueDriversCount} condutores
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="font-display text-3xl font-extrabold font-mono-tabular leading-none text-[#06295A]">
                {analysis.retrainCount + analysis.blitzAbove30Count}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1.5">
                Reciclagem (&lt;80%) ou Blitz &gt; 30 min · Média {analysis.avgDurationMin} min
              </div>
            </div>
          </section>

          {allRecords.length === 0 ? (
            <section className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <ClipboardCheck className="w-10 h-10 text-[#1565D8] mx-auto mb-3" />
              <h3 className="font-display text-base font-bold text-[#06295A]">
                Nenhum DTO finalizado ainda
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Clique em &ldquo;Iniciar DTO&rdquo; para abrir o Checklist Frota de 19 passos, acompanhar o tempo da execução e gerar as análises da equipe.
              </p>
              <button
                type="button"
                onClick={openStartDtoFlow}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3C7D] hover:bg-[#06295A] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Iniciar Primeiro DTO
              </button>
            </section>
          ) : (
            <>
              {/* Row 1 Charts: Monthly Score & Volume + Action Donut */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Monthly Bar Chart */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-[#06295A]">
                      PONTUAÇÃO MÉDIA DTO (%) POR MÊS
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      Linha tracejada: Meta {savedConfig.targetScorePct}%
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
                          top: `calc(1.25rem + ${(100 - savedConfig.targetScorePct) / 100} * (100% - 1.25rem))`,
                        }}
                      />

                      <div className="relative z-10 h-full grid grid-cols-12 gap-1.5 items-end">
                        {analysis.monthlySeries.map((pt) => {
                          const val = pt.avgScorePct ?? 0;
                          const active = selectedMonth === pt.month;
                          const dimmed = selectedMonth !== 'ALL' && !active;
                          return (
                            <button
                              key={pt.month}
                              type="button"
                              disabled={pt.avgScorePct === null}
                              onClick={() =>
                                setSelectedMonth(active ? 'ALL' : pt.month)
                              }
                              title={
                                pt.avgScorePct !== null
                                  ? `${pt.month}: Média ${val}% (${pt.count} DTOs)`
                                  : `${pt.month}: Sem DTOs`
                              }
                              className="group h-full flex flex-col items-center justify-end cursor-pointer focus-visible:outline-none min-w-0"
                            >
                              {pt.avgScorePct !== null && (
                                <span className="text-[11px] font-bold font-mono-tabular text-[#06295A] mb-1 leading-none">
                                  {val}%
                                </span>
                              )}
                              <div className="w-full max-w-[34px] flex-1 flex items-end justify-center">
                                <div
                                  className="w-full rounded-t-lg transition-opacity group-hover:brightness-110"
                                  style={{
                                    height:
                                      pt.avgScorePct !== null
                                        ? `${Math.max(val, 6)}%`
                                        : '0%',
                                    background: scoreBarGradient(val),
                                    opacity: dimmed ? 0.35 : 1,
                                  }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pl-9 pr-1 pt-2 grid grid-cols-12 gap-1.5">
                      {analysis.monthlySeries.map((pt) => (
                        <button
                          key={pt.month}
                          type="button"
                          onClick={() =>
                            setSelectedMonth(
                              selectedMonth === pt.month ? 'ALL' : pt.month
                            )
                          }
                          className="text-center cursor-pointer"
                        >
                          <div
                            className={`text-[11px] ${
                              selectedMonth === pt.month
                                ? 'font-bold text-[#1565D8]'
                                : 'font-semibold text-slate-600'
                            }`}
                          >
                            {pt.month}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-slate-400">
                            {pt.count > 0 ? `${pt.count}x` : '—'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Classification Donut */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                  <h3 className="font-display text-sm font-bold text-[#06295A]">
                    ENQUADRAMENTO DOS DTOS
                  </h3>

                  <div className="my-4 flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative shrink-0 w-[156px] h-[156px]">
                      <svg
                        viewBox={`0 0 ${donutData.size} ${donutData.size}`}
                        className="w-full h-full -rotate-90"
                      >
                        <circle
                          cx={donutData.size / 2}
                          cy={donutData.size / 2}
                          r={donutData.radius}
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth={donutData.strokeWidth}
                        />
                        {donutData.total > 0 &&
                          donutData.slices
                            .filter((s) => s.count > 0)
                            .map((slice) => {
                              const isSelected =
                                selectedBand === 'ALL' || selectedBand === slice.band;
                              return (
                                <circle
                                  key={slice.band}
                                  cx={donutData.size / 2}
                                  cy={donutData.size / 2}
                                  r={donutData.radius}
                                  fill="none"
                                  stroke={slice.color}
                                  strokeWidth={donutData.strokeWidth}
                                  strokeDasharray={`${Math.max(
                                    slice.dashLength - 1.2,
                                    0
                                  )} ${slice.gapLength + 1.2}`}
                                  strokeDashoffset={slice.dashOffset}
                                  opacity={isSelected ? 1 : 0.3}
                                  className="transition-all duration-200 cursor-pointer"
                                  onClick={() =>
                                    setSelectedBand(
                                      selectedBand === slice.band ? 'ALL' : slice.band
                                    )
                                  }
                                />
                              );
                            })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                        <span className="font-display text-2xl font-extrabold text-[#06295A] font-mono-tabular leading-none">
                          {donutData.total}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 mt-1">
                          DTOs
                        </span>
                      </div>
                    </div>

                    <ul className="flex-1 w-full space-y-2">
                      {donutData.slices.map((slice) => {
                        const active = selectedBand === slice.band;
                        return (
                          <li key={slice.band}>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedBand(active ? 'ALL' : slice.band)
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
                                <span className="truncate">
                                  {shortActionLabel(slice.band)}
                                </span>
                              </span>
                              <span className="font-mono-tabular shrink-0 font-bold text-[#06295A]">
                                {slice.count} ({slice.pct}%)
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {analysis.blitzAbove30Count > 0 && (
                        <li className="px-2.5 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200 text-[11px] font-semibold text-[#06295A] flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#1565D8]" />
                            Blitz &gt; 30 min (Tempos e mov.)
                          </span>
                          <span className="font-mono-tabular font-bold">
                            {analysis.blitzAbove30Count}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Row 2 Charts: Step Deviations + Leader Coverage */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Step Deviations */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#06295A]">
                        CONFORMIDADE POR PASSO DO CHECKLIST (TOP DESVIOS)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Passos com mais respostas &ldquo;NÃO&rdquo; para direcionar feedback e treinamento
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {analysis.stepDeviations.slice(0, 7).map((st) => (
                      <div key={st.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-slate-700 truncate">
                            <strong className="text-[#06295A] font-mono-tabular">
                              #{st.number}
                            </strong>{' '}
                            {st.label}
                          </span>
                          <span className="font-mono-tabular font-bold text-[#06295A] shrink-0">
                            {st.conformityPct}% SIM ({st.naoCount} NÃO)
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(4, st.conformityPct)}%`,
                              backgroundColor:
                                st.conformityPct === 100
                                  ? '#1565D8'
                                  : st.conformityPct >= 80
                                    ? '#3B82F6'
                                    : '#06295A',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaders Summary */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <h3 className="font-display text-sm font-bold text-[#06295A]">
                    DTOS POR LIDERANÇA (RESPONSÁVEL)
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Acompanhamento de realização e média por avaliador
                  </p>

                  <div className="space-y-2.5">
                    {analysis.byLeader.map((ld) => {
                      const pctGoal = Math.min(
                        100,
                        Math.round(
                          (ld.count / Math.max(1, savedConfig.monthlyTargetCount)) * 100
                        )
                      );
                      return (
                        <button
                          key={ld.responsible}
                          type="button"
                          onClick={() =>
                            setSelectedLeader(
                              selectedLeader === ld.responsible ? 'ALL' : ld.responsible
                            )
                          }
                          className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                            selectedLeader === ld.responsible
                              ? 'border-[#1565D8] bg-blue-50/60'
                              : 'border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-[#06295A] truncate">
                              {ld.responsible}
                            </span>
                            <span className="font-mono-tabular font-bold text-[#1565D8] shrink-0">
                              {ld.count} DTO{ld.count > 1 ? 's' : ''} · {ld.avgScorePct}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#1565D8]"
                              style={{ width: `${Math.max(8, pctGoal)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* History Table */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#06295A]">
                    HISTÓRICO DE DTOS REALIZADOS ({filteredRecords.length})
                  </h3>
                </div>

                {/* Mobile History Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredRecords.map((row) => (
                    <div key={row.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-[#06295A] truncate">
                            {row.driver}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {row.date} · {row.vehiclePlate} ({row.operation})
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono-tabular font-extrabold text-sm text-[#1565D8]">
                            {row.scorePct}%
                          </div>
                          <div className="text-[10px] font-mono-tabular text-slate-400">
                            {typeof row.durationSeconds === 'number'
                              ? formatDurationMMSS(row.durationSeconds)
                              : `${row.blitzDurationMin ?? 0} min`}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Líder:</span>{' '}
                        {row.responsible} · {row.reason}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${actionBadgeClass(
                            row.actionBand
                          )}`}
                        >
                          {shortActionLabel(row.actionBand)}
                        </span>

                        <div className="inline-flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDetailRecord(row)}
                            title="Ver DTO completo"
                            className="p-1.5 rounded-lg border border-slate-200 text-[#06295A] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditDto(row)}
                            title="Editar DTO"
                            className="p-1.5 rounded-lg border border-slate-200 text-[#1565D8] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(row.id)}
                            title="Excluir DTO"
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop History Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2.5 px-4">Data</th>
                        <th className="py-2.5 px-3">Responsável DTO</th>
                        <th className="py-2.5 px-3">Motorista</th>
                        <th className="py-2.5 px-3">Veículo</th>
                        <th className="py-2.5 px-3">Motivo</th>
                        <th className="py-2.5 px-3 text-right">Duração</th>
                        <th className="py-2.5 px-3 text-right">Pontuação</th>
                        <th className="py-2.5 px-3">Ação Recomendada</th>
                        <th className="py-2.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredRecords.map((row) => (
                        <tr key={row.id} className="hover:bg-[#F7FAFF]">
                          <td className="py-2.5 px-4 font-mono-tabular whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#06295A]">
                            {row.responsible}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {row.driver}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono-tabular font-bold text-[#06295A]">
                              {row.vehiclePlate}
                            </span>
                            <span className="text-slate-400 ml-1.5 text-[11px]">
                              ({row.operation})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-600">
                            {row.reason}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                            {typeof row.durationSeconds === 'number'
                              ? formatDurationMMSS(row.durationSeconds)
                              : `${row.blitzDurationMin ?? 0} min`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular font-extrabold text-[#1565D8]">
                            {row.scorePct}%
                            <span className="block text-[10px] font-normal text-slate-400">
                              {row.simCount}/19 SIM
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${actionBadgeClass(
                                row.actionBand
                              )}`}
                            >
                              {shortActionLabel(row.actionBand)}
                            </span>
                            {row.blitzAbove30 && (
                              <span className="block text-[10px] font-bold text-[#0B3C7D] mt-0.5">
                                Blitz &gt;30min (Tempos e mov.)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailRecord(row)}
                                title="Ver DTO completo"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[#06295A] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditDto(row)}
                                title="Editar DTO"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[#1565D8] cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(row.id)}
                                title="Excluir DTO"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* Detail Modal (styled faithfully like DTO - CHECKLIST FROTA) */}
      {detailRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setDetailRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-300 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#F7FAFE]">
              <div>
                <h4 className="font-display text-sm font-bold text-[#06295A]">
                  DTO - CHECKLIST FROTA · {detailRecord.driver} ({detailRecord.vehiclePlate})
                </h4>
                <p className="text-xs text-slate-500">
                  Data: {detailRecord.date} · Responsável: {detailRecord.responsible} · Duração:{' '}
                  {typeof detailRecord.durationSeconds === 'number'
                    ? formatDurationMMSS(detailRecord.durationSeconds)
                    : `${detailRecord.blitzDurationMin ?? 0} min`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEditDto(detailRecord)}
                  className="px-3 py-1.5 rounded-lg bg-[#0B3C7D] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setDetailRecord(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div>
                  <strong className="text-slate-600">Data:</strong> {detailRecord.date}
                </div>
                <div>
                  <strong className="text-slate-600">Responsável DTO:</strong>{' '}
                  {detailRecord.responsible}
                </div>
                <div>
                  <strong className="text-slate-600">Motivo DTO:</strong> {detailRecord.reason}
                </div>
                <div>
                  <strong className="text-slate-600">Motorista:</strong> {detailRecord.driver}
                </div>
                <div className="sm:col-span-2">
                  <strong className="text-slate-600">Veículo:</strong>{' '}
                  {detailRecord.vehicleLabel} ({detailRecord.operation})
                </div>
              </div>

              {detailRecord.generalObservation && (
                <div className="rounded-xl bg-blue-50/50 border border-blue-200 px-3.5 py-2 text-xs text-slate-700">
                  <strong className="text-[#06295A]">Observação geral:</strong>{' '}
                  {detailRecord.generalObservation}
                </div>
              )}

              {/* Mobile Steps List in Modal */}
              <div className="md:hidden space-y-2">
                {DTO_STEPS.map((step) => {
                  const ans = detailRecord.steps[step.id];
                  const isSim = ans?.answer === 'SIM';
                  return (
                    <div
                      key={step.id}
                      className="rounded-xl border border-slate-200 p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-800">
                          <strong className="text-[#06295A] font-mono-tabular mr-1.5">
                            #{step.number}
                          </strong>
                          {step.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                            isSim
                              ? 'bg-blue-50 text-[#1565D8]'
                              : 'bg-[#5A606B] text-white'
                          }`}
                        >
                          {isSim ? 'SIM' : 'NÃO'}
                        </span>
                      </div>
                      {ans?.observation && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">
                          Obs.: {ans.observation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Steps Table in Modal */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-slate-200/80 border-b border-slate-300 text-[11px] font-bold text-slate-800">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center border-r border-slate-300">
                        #
                      </th>
                      <th className="py-2 px-2.5 border-r border-slate-300">Passo</th>
                      <th className="py-2 px-2 w-16 text-center border-r border-slate-300">
                        SIM
                      </th>
                      <th className="py-2 px-2 w-16 text-center border-r border-slate-300">
                        NÃO
                      </th>
                      <th className="py-2 px-2.5">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {DTO_STEPS.map((step) => {
                      const ans = detailRecord.steps[step.id];
                      const isSim = ans?.answer === 'SIM';
                      return (
                        <tr key={step.id}>
                          <td className="py-2 px-2.5 text-center font-mono-tabular font-bold text-[#06295A] border-r border-slate-300">
                            {step.number}
                          </td>
                          <td className="py-2 px-2.5 text-slate-800 border-r border-slate-300">
                            {step.label}
                          </td>
                          <td className="py-2 px-2 text-center bg-white border-r border-slate-300 font-bold text-[#1565D8]">
                            {isSim ? '✓' : ''}
                          </td>
                          <td className="py-2 px-2 text-center bg-[#5A606B] text-white border-r border-slate-300 font-bold">
                            {!isSim ? '✕' : ''}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600">
                            {ans?.observation || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-300 grid grid-cols-1 sm:grid-cols-12 text-xs">
                <div className="sm:col-span-6 bg-slate-200/80 p-3 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r border-slate-300">
                  <span className="font-bold text-slate-900">Pontuação Equipe (%):</span>
                  <span className="text-[11px] text-slate-600">
                    ({detailRecord.simCount} espaços em branco ÷ 19)
                  </span>
                </div>
                <div className="sm:col-span-2 bg-white p-3 flex items-center justify-center font-display text-2xl font-extrabold font-mono-tabular text-[#1565D8] border-b sm:border-b-0 sm:border-r border-slate-300">
                  {detailRecord.scorePct}%
                </div>
                <div className="sm:col-span-4 bg-white p-2.5 flex flex-col justify-center gap-1">
                  <span className="font-bold text-[#06295A]">
                    {detailRecord.actionBand}
                  </span>
                  {detailRecord.blitzAbove30 && (
                    <span className="text-[11px] font-bold text-[#1565D8]">
                      Blitz &gt; 30 min ► Fazer tempos e movimentos da blitz
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setConfigModalOpen(false)}
        >
          <form
            onSubmit={handleSaveConfig}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-display text-base font-bold text-[#06295A]">
                Meta Mensal de DTO
              </h4>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mínimo mensal de DTOs (quantidade/mês)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={draftMonthlyTarget}
                onChange={(e) => setDraftMonthlyTarget(Number(e.target.value))}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm font-mono-tabular font-bold text-[#06295A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Meta de pontuação mínima (%)
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={draftTargetScore}
                onChange={(e) => setDraftTargetScore(Number(e.target.value))}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm font-mono-tabular font-bold text-[#1565D8]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0B3C7D] text-white text-xs font-semibold cursor-pointer"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <h4 className="font-display text-base font-bold text-[#06295A]">
              Excluir DTO?
            </h4>
            <p className="text-xs text-slate-600">
              Este registro de DTO será removido permanentemente das análises e do histórico.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRecord(confirmDeleteId);
                  setConfirmDeleteId(null);
                  showNotice('DTO excluído do histórico.');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
