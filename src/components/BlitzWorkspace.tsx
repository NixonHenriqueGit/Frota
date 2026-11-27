import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Pencil,
  Play,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  BlitzInspectionPayload,
  BlitzItemStatus,
  BlitzZoneKey,
  ComplianceMonth,
  LegalizedDocumentRecord,
  SafetyCheckMonthKey,
  SafetyCheckOperation,
  StratifiedProblemMoment,
  Vehicle,
} from '../types/fleet';
import {
  BLITZ_MONTHS,
  getCurrentComplianceMonth,
  monthToSafetyKey,
} from '../data/blitzEntregaSeed';
import {
  BlitzConfig,
  BlitzMidColumnKey,
  buildBlitzRecord,
  computeBlitzPercentForItems,
  parseBlitzRecord,
} from '../data/blitzCatalog';
import { SAFETY_CHECK_SEED_ROWS } from '../data/safetyCheckSeed';

interface BlitzWorkspaceProps {
  config: BlitzConfig;
  records: LegalizedDocumentRecord[];
  vehicles: Vehicle[];
  onBack: () => void;
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onSyncPercentToSafetyCheck: (
    operation: SafetyCheckOperation,
    plate: string,
    monthKey: SafetyCheckMonthKey,
    percent: number
  ) => void;
}

function nowDateBr(): string {
  return new Date().toLocaleDateString('pt-BR');
}

function nowTimeBr(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function inferSafetyOperation(v: Vehicle): SafetyCheckOperation {
  if (v.category === 'Empilhadeira' || v.sector === 'Armazém') return 'ARMAZÉM';
  if (
    v.sector === 'Puxada' ||
    v.category === 'Tração Caminhão Trator' ||
    v.category === 'Carga Semi-Reboque'
  ) {
    return 'PUXADA';
  }
  return 'ENTREGA';
}

function createAllOkMap(config: BlitzConfig): Record<string, BlitzItemStatus> {
  const map: Record<string, BlitzItemStatus> = {};
  for (const item of config.items) {
    map[item.id] = 'OK';
  }
  return map;
}

function getMidColumnValue(entry: BlitzInspectionPayload, col: BlitzMidColumnKey): string {
  switch (col) {
    case 'Mapa:':
      return entry.mapa || '—';
    case 'PLACA:':
      return entry.placa;
    case 'Nome:':
      return entry.nome || '—';
    case 'CPF:':
      return entry.cpf || '—';
  }
}

function getMidColumnExportValue(
  entry: BlitzInspectionPayload,
  col: BlitzMidColumnKey
): string {
  switch (col) {
    case 'Mapa:':
      return entry.mapa;
    case 'PLACA:':
      return entry.placa;
    case 'Nome:':
      return entry.nome;
    case 'CPF:':
      return entry.cpf;
  }
}

export const BlitzWorkspace: React.FC<BlitzWorkspaceProps> = ({
  config,
  records,
  vehicles,
  onBack,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
  onSyncPercentToSafetyCheck,
}) => {
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingDisplayId, setEditingDisplayId] = useState<string>('');

  // Form fields — Criador & Mês stay sticky between inspections for fast sequential work
  const [mes, setMes] = useState<ComplianceMonth>(() => getCurrentComplianceMonth());
  const [criador, setCriador] = useState('');
  const [dataStr, setDataStr] = useState(() => nowDateBr());
  const [horaStr, setHoraStr] = useState(() => nowTimeBr());
  const [placa, setPlaca] = useState('');
  const [mapa, setMapa] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [momento, setMomento] = useState<StratifiedProblemMoment>('Saída');
  const [itemsMap, setItemsMap] = useState<Record<string, BlitzItemStatus>>(() =>
    createAllOkMap(config)
  );

  const [activeStageKey, setActiveStageKey] = useState<BlitzZoneKey | null>(null);
  const [completedZones, setCompletedZones] = useState<Record<string, boolean>>({});
  const [showNokOnly, setShowNokOnly] = useState(false);
  const [manualPlateMode, setManualPlateMode] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Table filter state
  const [tableSearch, setTableSearch] = useState('');
  const [tableMonthFilter, setTableMonthFilter] = useState<'ALL' | ComplianceMonth>('ALL');

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const parsedEntries: BlitzInspectionPayload[] = useMemo(() => {
    const out: BlitzInspectionPayload[] = [];
    records.forEach((rec, idx) => {
      const parsed = parseBlitzRecord(config, rec.fileDataUrl, rec.id);
      if (parsed) {
        out.push({
          ...parsed,
          id: rec.id,
          displayId: parsed.displayId || String(records.length - idx),
        });
      }
    });
    return out;
  }, [config, records]);

  // Roster of plates/equipment matching this Blitz's operation for 1-click yard chips
  const operationPlates = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    for (const seed of SAFETY_CHECK_SEED_ROWS) {
      if (seed.operation === config.safetyOperation) {
        const clean = seed.plate.toUpperCase().trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    }

    for (const v of vehicles) {
      if (inferSafetyOperation(v) === config.safetyOperation) {
        const clean = v.plate.toUpperCase().trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    }

    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [config.safetyOperation, vehicles]);

  const inspectedInMonthMap = useMemo(() => {
    const map = new Map<string, BlitzInspectionPayload>();
    for (const entry of parsedEntries) {
      if (entry.mes === mes) {
        const norm = entry.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (!map.has(norm)) {
          map.set(norm, entry);
        }
      }
    }
    return map;
  }, [parsedEntries, mes]);

  const liveStats = useMemo(
    () => computeBlitzPercentForItems(config.items, itemsMap),
    [config.items, itemsMap]
  );

  const setItemStatus = (itemId: string, status: BlitzItemStatus) => {
    setItemsMap((prev) => ({
      ...prev,
      [itemId]: status,
    }));
  };

  const markAllItems = (status: BlitzItemStatus) => {
    const next: Record<string, BlitzItemStatus> = {};
    for (const item of config.items) {
      next[item.id] = status;
    }
    setItemsMap(next);
  };

  const markZoneOk = (zone: BlitzZoneKey) => {
    setItemsMap((prev) => {
      const next = { ...prev };
      for (const item of config.items) {
        if (item.zone === zone) next[item.id] = 'OK';
      }
      return next;
    });
  };

  const resetForNextTruck = (nextPlate = '') => {
    setEditingRecordId(null);
    setEditingDisplayId('');
    setPlaca(nextPlate);
    setMapa('');
    setNome('');
    setCpf('');
    setMomento('Saída');
    setDataStr(nowDateBr());
    setHoraStr(nowTimeBr());
    setItemsMap(createAllOkMap(config));
    setActiveStageKey(null);
    setCompletedZones({});
    setShowNokOnly(false);
    setManualPlateMode(false);
  };

  const handleSave = (advanceToNext: boolean) => {
    const cleanPlate = placa.replace(/[^A-Z0-9-]/gi, '').toUpperCase().trim();
    if (!cleanPlate) {
      showNotice('Selecione ou digite a PLACA / código antes de salvar.');
      return;
    }

    const displayId = editingDisplayId || String(parsedEntries.length + 1);
    const payload: BlitzInspectionPayload = {
      id: editingRecordId ?? '',
      displayId,
      mes,
      criador: criador.trim() || 'Inspetor',
      data: dataStr.trim() || nowDateBr(),
      hora: horaStr.trim() || nowTimeBr(),
      percentual: liveStats.percent,
      mapa: config.hasMapa ? mapa.trim() : '',
      placa: cleanPlate,
      nome: nome.trim(),
      cpf: cpf.trim(),
      momento,
      items: itemsMap,
    };

    const builtDoc = buildBlitzRecord(config, payload, payload.data);

    if (editingRecordId) {
      onUpdateRecord(editingRecordId, {
        fileName: builtDoc.fileName,
        fileType: builtDoc.fileType,
        fileSize: builtDoc.fileSize,
        plate: builtDoc.plate,
        expiryDate: builtDoc.expiryDate,
        referenceDate: builtDoc.referenceDate,
        notes: builtDoc.notes,
        uploadedAt: builtDoc.uploadedAt,
        fileDataUrl: builtDoc.fileDataUrl,
      });
    } else {
      onAddRecords([builtDoc]);
    }

    // Sempre atualiza automaticamente o % no Check de Segurança
    onSyncPercentToSafetyCheck(
      config.safetyOperation,
      cleanPlate,
      monthToSafetyKey(mes),
      liveStats.percent
    );

    if (advanceToNext) {
      const currentNorm = cleanPlate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const nextPending = operationPlates.find((p) => {
        const pNorm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return pNorm !== currentNorm && !inspectedInMonthMap.has(pNorm);
      });
      resetForNextTruck(nextPending ?? '');
      showNotice(
        `Blitz de ${cleanPlate} salva (${liveStats.percent}%) e atualizada em Check de Segurança (${config.safetyOperation} · ${mes}).${
          nextPending ? ` Próxima carregada: ${nextPending}.` : ''
        }`
      );
    } else {
      setEditingRecordId(builtDoc.id);
      setEditingDisplayId(displayId);
      showNotice(
        `Blitz de ${cleanPlate} salva (${liveStats.percent}%) e atualizada em Check de Segurança (${config.safetyOperation} · ${mes}).`
      );
    }
  };

  const handleLoadEntry = (entry: BlitzInspectionPayload) => {
    setEditingRecordId(entry.id);
    setEditingDisplayId(entry.displayId);
    setMes(entry.mes);
    setCriador(entry.criador);
    setDataStr(entry.data);
    setHoraStr(entry.hora);
    setPlaca(entry.placa);
    setMapa(entry.mapa);
    setNome(entry.nome);
    setCpf(entry.cpf);
    setMomento(entry.momento === 'Retorno' ? 'Retorno' : 'Saída');
    setItemsMap({ ...createAllOkMap(config), ...entry.items });
    setActiveStageKey(config.zones[0]?.key ?? null);
    setCompletedZones({});
    setShowNokOnly(false);
    setViewMode('form');
  };

  const firstItemsBlock = useMemo(
    () => config.items.slice(0, config.midAfterItemCount),
    [config]
  );
  const lastItemsBlock = useMemo(
    () => config.items.slice(config.midAfterItemCount),
    [config]
  );
  const totalColumnsCount =
    6 + config.items.length + config.midColumnsOrder.length;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const rows = parsedEntries.map((entry, idx) => {
      const out: Record<string, string> = {
        Mês: entry.mes,
        id: entry.displayId || String(idx + 1),
        Criador: entry.criador,
        Data: entry.data,
        Hora: entry.hora,
        '%Percentual': `${entry.percentual}%`,
      };
      for (const item of firstItemsBlock) {
        out[item.label] = entry.items[item.id] ?? 'OK';
      }
      for (const midCol of config.midColumnsOrder) {
        out[midCol] = getMidColumnExportValue(entry, midCol);
      }
      for (const item of lastItemsBlock) {
        out[item.label] = entry.items[item.id] ?? 'OK';
      }
      return out;
    });

    const emptyRow: Record<string, string> = {
      Mês: '',
      id: '',
      Criador: '',
      Data: '',
      Hora: '',
      '%Percentual': '',
    };
    for (const item of firstItemsBlock) emptyRow[item.label] = '';
    for (const midCol of config.midColumnsOrder) emptyRow[midCol] = '';
    for (const item of lastItemsBlock) emptyRow[item.label] = '';

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyRow]);
    XLSX.utils.book_append_sheet(wb, ws, config.excelSheetName.slice(0, 31));
    XLSX.writeFile(wb, config.excelFileName);
    showNotice(
      `Planilha ${config.title} exportada com todas as ${totalColumnsCount} colunas.`
    );
  };

  const filteredTableRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return parsedEntries.filter((e) => {
      if (tableMonthFilter !== 'ALL' && e.mes !== tableMonthFilter) return false;
      if (!q) return true;
      return (
        e.placa.toLowerCase().includes(q) ||
        e.criador.toLowerCase().includes(q) ||
        e.nome.toLowerCase().includes(q) ||
        e.mapa.toLowerCase().includes(q)
      );
    });
  }, [parsedEntries, tableSearch, tableMonthFilter]);

  const activeStageIndex = useMemo(
    () => config.zones.findIndex((z) => z.key === activeStageKey),
    [config.zones, activeStageKey]
  );

  const completedStagesCount = useMemo(
    () => config.zones.filter((z) => completedZones[z.key]).length,
    [config.zones, completedZones]
  );

  const pendingPlates = useMemo(
    () =>
      operationPlates.filter((p) => {
        const pNorm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return !inspectedInMonthMap.has(pNorm);
      }),
    [operationPlates, inspectedInMonthMap]
  );

  const completedPlates = useMemo(
    () =>
      operationPlates.filter((p) => {
        const pNorm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return inspectedInMonthMap.has(pNorm);
      }),
    [operationPlates, inspectedInMonthMap]
  );

  const handleSelectNextPending = () => {
    const currentNorm = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const next =
      pendingPlates.find(
        (p) => p.replace(/[^A-Z0-9]/gi, '').toUpperCase() !== currentNorm
      ) ?? pendingPlates[0];
    if (next) {
      setManualPlateMode(false);
      setPlaca(next);
    } else {
      showNotice(`Todos os ${operationPlates.length} veículos já foram verificados em ${mes}.`);
    }
  };

  const handleStartStage = (zoneKey: BlitzZoneKey) => {
    setShowNokOnly(false);
    setActiveStageKey(zoneKey);
  };

  const handleCompleteStageAndAdvance = () => {
    if (!activeStageKey) return;
    setCompletedZones((prev) => ({ ...prev, [activeStageKey]: true }));
    const idx = config.zones.findIndex((z) => z.key === activeStageKey);
    if (idx >= 0 && idx + 1 < config.zones.length) {
      setActiveStageKey(config.zones[idx + 1].key);
    } else {
      setActiveStageKey(null);
      showNotice(
        `Todas as ${config.zones.length} etapas concluídas (${liveStats.percent}%). Clique em "Salvar Blitz" para finalizar.`
      );
    }
  };

  return (
    <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Navy Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-bold text-white cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-[1rem] font-extrabold tracking-wide text-white uppercase truncate">
                {config.title}
              </h2>
              <span
                className={`font-mono-tabular text-[11px] font-extrabold px-2 py-0.5 rounded border shrink-0 ${
                  liveStats.percent === 100
                    ? 'bg-emerald-500/25 border-emerald-300/50 text-emerald-100'
                    : 'bg-amber-500/25 border-amber-300/60 text-amber-100'
                }`}
              >
                {liveStats.percent}% · {liveStats.nokCount} NOK
              </span>
            </div>
            <p className="text-[0.74rem] text-blue-100/85 mt-0.5 truncate">
              {config.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-white/10 border border-white/20">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'form'
                  ? 'bg-white text-[#06295A] shadow-xs'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Blitz Rápida</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#06295A] shadow-xs'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Planilha ({parsedEntries.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
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

      {viewMode === 'form' ? (
        <div className="flex-1 flex flex-col">
          {/* Step 1: Organized Vehicle Selector + Clean Metadata */}
          <div className="p-4 bg-[#F7FAFE] border-b border-slate-200 space-y-3">
            {/* Primary Row: Vehicle Select, Month, Next Pending, Collapsible Fleet List */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#06295A]">
                    1. {config.plateLabel} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualPlateMode((prev) => !prev)}
                    className="text-[10.5px] font-bold text-[#1256BA] hover:underline cursor-pointer"
                  >
                    {manualPlateMode ? 'Escolher da lista' : 'Digitar outra placa'}
                  </button>
                </div>

                {manualPlateMode ? (
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    placeholder={config.platePlaceholder}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 font-mono-tabular text-xs font-extrabold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                ) : (
                  <select
                    value={operationPlates.includes(placa) ? placa : ''}
                    onChange={(e) => setPlaca(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 font-mono-tabular text-xs font-bold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8] cursor-pointer"
                  >
                    <option value="">
                      Selecione um veículo ({pendingPlates.length} pendentes)...
                    </option>
                    {pendingPlates.length > 0 && (
                      <optgroup label={`Pendentes em ${mes} (${pendingPlates.length})`}>
                        {pendingPlates.map((p) => (
                          <option key={p} value={p}>
                            {p} — Pendente
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {completedPlates.length > 0 && (
                      <optgroup label={`Já verificados em ${mes} (${completedPlates.length})`}>
                        {completedPlates.map((p) => {
                          const pNorm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                          const done = inspectedInMonthMap.get(pNorm);
                          return (
                            <option key={p} value={p}>
                              {p} — ✓ {done?.percentual ?? 100}%
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#06295A] mb-1">
                  Mês *
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value as ComplianceMonth)}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs font-bold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8] cursor-pointer"
                >
                  {BLITZ_MONTHS.map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#06295A] mb-1">
                  Momento
                </label>
                <div className="grid grid-cols-2 h-9 p-0.5 rounded-lg bg-slate-200/80 border border-slate-300">
                  {(['Saída', 'Retorno'] as StratifiedProblemMoment[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMomento(opt)}
                      className={`rounded-md text-xs font-bold transition-all cursor-pointer ${
                        momento === opt
                          ? opt === 'Saída'
                            ? 'bg-[#0B3C7D] text-white shadow-xs'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-[#06295A]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 flex items-center">
                <button
                  type="button"
                  onClick={handleSelectNextPending}
                  className="w-full h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Próximo Pendente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Clean Metadata Row + Optional Details Toggle */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  config.hasMapa ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                } gap-3 items-end`}
              >
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                    Criador / Inspetor
                  </label>
                  <input
                    type="text"
                    value={criador}
                    onChange={(e) => setCriador(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                    {config.driverLabel}
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder={config.driverPlaceholder}
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                </div>

                {config.hasMapa && (
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                      Mapa
                    </label>
                    <input
                      type="text"
                      value={mapa}
                      onChange={(e) => setMapa(e.target.value)}
                      placeholder="Nº Mapa"
                      className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 font-mono-tabular text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-mono-tabular text-slate-600 font-semibold truncate">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {dataStr} · {horaStr}
                      {cpf ? ` · CPF` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowExtraDetails((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1256BA] hover:underline cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{showExtraDetails ? 'Ocultar' : 'Data/CPF'}</span>
                  </button>
                </div>
              </div>

              {showExtraDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-white border border-slate-200">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                      Data
                    </label>
                    <input
                      type="text"
                      value={dataStr}
                      onChange={(e) => setDataStr(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 font-mono-tabular text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                      Hora
                    </label>
                    <input
                      type="text"
                      value={horaStr}
                      onChange={(e) => setHoraStr(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 font-mono-tabular text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 font-mono-tabular text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Top Quick Actions Bar */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-[#06295A]">
                Etapas do Check ({completedStagesCount}/{config.zones.length} concluídas)
              </span>
              <button
                type="button"
                onClick={() => setShowNokOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  showNokOnly
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Só NOK ({liveStats.nokCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => markAllItems('OK')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar Tudo OK ({config.items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => resetForNextTruck(placa)}
                title="Reiniciar formulário"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar</span>
              </button>
            </div>
          </div>

          {/* Step 3: Stage-by-Stage Guided Inspection (Left Stage Buttons + Right Active Check Items) */}
          <div className="flex-1 p-4 bg-[#F6F9FE] grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: 6 Stages with "Iniciar" button beside each stage */}
            <aside className="lg:col-span-4 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(6,41,90,0.04)] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#06295A] text-white flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide">
                  Etapas da Inspeção
                </span>
                <span className="font-mono-tabular text-[11px] font-bold text-blue-200">
                  {completedStagesCount}/{config.zones.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {config.zones.map((zone, idx) => {
                  const zoneItems = config.items.filter((i) => i.zone === zone.key);
                  const nokCount = zoneItems.filter((i) => itemsMap[i.id] === 'NOK').length;
                  const isActive = !showNokOnly && activeStageKey === zone.key;
                  const isDone = Boolean(completedZones[zone.key]);
                  const isFirstSuggested =
                    !activeStageKey && !showNokOnly && !isDone && idx === 0;

                  return (
                    <div
                      key={zone.key}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-colors ${
                        isActive
                          ? 'bg-[#EEF4FC] ring-1 ring-inset ring-[#1565D8]/40'
                          : isDone
                            ? 'bg-emerald-50/40'
                            : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-[#06295A] truncate">
                            {zone.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="font-mono-tabular text-slate-500 font-semibold">
                            {zoneItems.length} itens
                          </span>
                          {nokCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                              {nokCount} NOK
                            </span>
                          )}
                          {isDone && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold text-[10.5px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Concluída
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartStage(zone.key)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-[#0B3C7D] text-white shadow-xs'
                            : isDone
                              ? 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              : isFirstSuggested
                                ? 'bg-[#1256BA] hover:bg-[#0B3C7D] text-white shadow-xs'
                                : 'bg-white border border-[#1256BA]/40 text-[#0B3C7D] hover:bg-blue-50'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>
                          {isActive ? 'Em check' : isDone ? 'Revisar' : 'Iniciar'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Right Column: Active Stage Items OR NOK Review OR Start Prompt */}
            <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(6,41,90,0.04)] overflow-hidden">
              {showNokOnly ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-red-700">
                      Itens Marcados como NOK ({liveStats.nokCount})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNokOnly(false);
                        if (!activeStageKey && config.zones[0]) {
                          setActiveStageKey(config.zones[0].key);
                        }
                      }}
                      className="text-xs font-bold text-[#1256BA] hover:underline cursor-pointer"
                    >
                      Voltar para etapas
                    </button>
                  </div>

                  {liveStats.nokCount === 0 ? (
                    <div className="p-8 text-center border border-dashed border-emerald-200 rounded-xl bg-emerald-50/40">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-[#06295A]">
                        Nenhum item com NOK nesta blitz ({liveStats.percent}% de conformidade).
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {config.items
                        .filter((item) => itemsMap[item.id] === 'NOK')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-red-50/70 border-red-300"
                          >
                            <span className="text-xs font-bold text-red-900 leading-snug">
                              {item.label}
                            </span>
                            <div className="inline-flex items-center gap-1 shrink-0">
                              {(['OK', 'NOK', 'NA'] as BlitzItemStatus[]).map((opt) => {
                                const active = itemsMap[item.id] === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setItemStatus(item.id, opt)}
                                    className={`px-2 py-1 rounded border text-[10.5px] font-extrabold cursor-pointer ${
                                      active
                                        ? opt === 'OK'
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : opt === 'NOK'
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-slate-600 text-white border-slate-600'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt === 'NA' ? 'N/A' : opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : activeStageIndex >= 0 ? (
                (() => {
                  const zone = config.zones[activeStageIndex];
                  const zoneItems = config.items.filter((i) => i.zone === zone.key);
                  const zoneNok = zoneItems.filter((i) => itemsMap[i.id] === 'NOK').length;
                  const nextZone = config.zones[activeStageIndex + 1] ?? null;
                  const prevZone =
                    activeStageIndex > 0 ? config.zones[activeStageIndex - 1] : null;

                  return (
                    <div className="flex flex-col">
                      <div className="px-4 py-3 bg-[#F4F8FD] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1256BA]">
                            Etapa {activeStageIndex + 1} de {config.zones.length}
                          </div>
                          <h3 className="font-display text-sm font-extrabold uppercase text-[#06295A]">
                            {zone.label}{' '}
                            <span className="font-mono-tabular text-xs font-semibold text-slate-500">
                              ({zoneItems.length} itens{zoneNok > 0 ? ` · ${zoneNok} NOK` : ''})
                            </span>
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => markZoneOk(zone.key)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Marcar Etapa Tudo OK</span>
                        </button>
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {zoneItems.map((item) => {
                          const status = itemsMap[item.id] ?? 'OK';
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                status === 'NOK'
                                  ? 'bg-red-50/70 border-red-300'
                                  : status === 'NA'
                                    ? 'bg-slate-50 border-slate-200'
                                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                              }`}
                            >
                              <span
                                className={`text-xs font-semibold leading-snug ${
                                  status === 'NOK'
                                    ? 'text-red-900 font-bold'
                                    : 'text-[#06295A]'
                                }`}
                              >
                                {item.label}
                              </span>

                              <div className="inline-flex items-center gap-1 shrink-0">
                                {(['OK', 'NOK', 'NA'] as BlitzItemStatus[]).map((opt) => {
                                  const active = status === opt;
                                  const btnClass = active
                                    ? opt === 'OK'
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : opt === 'NOK'
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-slate-600 text-white border-slate-600'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100';
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setItemStatus(item.id, opt)}
                                      className={`px-2 py-1 rounded border text-[10.5px] font-extrabold tracking-wide transition-colors cursor-pointer ${btnClass}`}
                                    >
                                      {opt === 'NA' ? 'N/A' : opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="px-4 py-3 bg-[#F4F8FD] border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {prevZone && (
                            <button
                              type="button"
                              onClick={() => setActiveStageKey(prevZone.key)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#06295A] cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Etapa Anterior</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleCompleteStageAndAdvance}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {nextZone
                              ? `Concluir e Iniciar ${nextZone.label}`
                              : 'Concluir Última Etapa'}
                          </span>
                          {nextZone && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1256BA]">
                    {completedStagesCount === config.zones.length
                      ? 'Todas as etapas finalizadas'
                      : 'Inspeção Guiada por Etapa'}
                  </div>
                  <h3 className="font-display text-base font-extrabold text-[#06295A]">
                    {completedStagesCount === config.zones.length
                      ? `Checklist completo (${liveStats.percent}% de conformidade)`
                      : `Primeiro passo: ${config.zones[0]?.label ?? 'Iniciar Check'}`}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {completedStagesCount === config.zones.length
                      ? 'Todas as 6 etapas foram revisadas. Clique em "Salvar Blitz" abaixo ou clique em "Revisar" ao lado de qualquer etapa.'
                      : 'Clique em "Iniciar" ao lado de cada etapa à esquerda para fazer os checks por seção, começando pela Cabine & Documentação.'}
                  </p>
                  {completedStagesCount < config.zones.length && config.zones[0] && (
                    <button
                      type="button"
                      onClick={() => handleStartStage(config.zones[0].key)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar {config.zones[0].label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer Save Bar — Always Auto-Syncs with Check de Segurança */}
          <div className="sticky bottom-0 z-10 px-4 py-3 bg-[#F4F8FD] border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#06295A]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Atualiza sempre automaticamente o % de <strong>{mes}</strong> em Check de Segurança ({config.safetyOperation})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-tabular text-xs font-extrabold text-[#06295A] mr-1">
                Resultado: {liveStats.percent}% ({liveStats.okCount} OK · {liveStats.nokCount} NOK ·{' '}
                {liveStats.naCount} N/A)
              </span>

              <button
                type="button"
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#0B3C7D] bg-white text-[#0B3C7D] hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingRecordId ? 'Atualizar Blitz' : 'Salvar Blitz'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <span>Salvar e Próxima Placa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Full Planilha / History Mode */
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2.5 bg-[#F4F8FD] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Buscar placa, criador, motorista..."
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-white border border-slate-200 text-xs font-medium text-[#06295A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40"
                />
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={tableMonthFilter}
                onChange={(e) =>
                  setTableMonthFilter(e.target.value as 'ALL' | ComplianceMonth)
                }
                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-[#06295A]"
              >
                <option value="ALL">Todos os Meses</option>
                {BLITZ_MONTHS.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.month}
                  </option>
                ))}
              </select>
            </div>

            <span className="font-mono-tabular text-xs font-semibold text-slate-500">
              {filteredTableRows.length} registros · {totalColumnsCount} colunas da planilha
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {filteredTableRows.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-bold text-[#06295A]">
                  Nenhum registro de {config.title} ainda.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Clique em &ldquo;Blitz Rápida&rdquo; para realizar a primeira inspeção.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="bg-[#06295A] text-white font-extrabold whitespace-nowrap">
                    <th className="py-2 px-2.5 border-r border-[#16427C] sticky left-0 z-10 bg-[#06295A]">
                      Ações
                    </th>
                    <th className="py-2 px-2.5 border-r border-[#16427C]">Mês</th>
                    <th className="py-2 px-2 border-r border-[#16427C]">id</th>
                    <th className="py-2 px-2.5 border-r border-[#16427C]">Criador</th>
                    <th className="py-2 px-2.5 border-r border-[#16427C]">Data</th>
                    <th className="py-2 px-2 border-r border-[#16427C]">Hora</th>
                    <th className="py-2 px-2.5 border-r border-[#16427C] text-center bg-[#0A3775]">
                      %Percentual
                    </th>
                    {firstItemsBlock.map((item) => (
                      <th
                        key={item.id}
                        className="py-2 px-2 border-r border-[#16427C] text-center"
                      >
                        {item.label}
                      </th>
                    ))}
                    {config.midColumnsOrder.map((midCol) => (
                      <th key={midCol} className="py-2 px-2.5 border-r border-[#16427C]">
                        {midCol}
                      </th>
                    ))}
                    {lastItemsBlock.map((item) => (
                      <th
                        key={item.id}
                        className="py-2 px-2 border-r border-[#16427C] text-center"
                      >
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredTableRows.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#F5F9FF] whitespace-nowrap">
                      <td className="py-1.5 px-2 border-r border-slate-200 sticky left-0 bg-white">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLoadEntry(entry)}
                            title="Editar blitz"
                            className="p-1 rounded text-slate-500 hover:text-[#1256BA] hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(entry.id)}
                            title="Excluir blitz"
                            className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-[#06295A] border-r border-slate-200">
                        {entry.mes}
                      </td>
                      <td className="py-1.5 px-2 font-mono-tabular text-slate-600 border-r border-slate-200">
                        {entry.displayId}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200">
                        {entry.criador || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono-tabular text-slate-700 border-r border-slate-200">
                        {entry.data}
                      </td>
                      <td className="py-1.5 px-2 font-mono-tabular text-slate-700 border-r border-slate-200">
                        {entry.hora}
                      </td>
                      <td
                        className={`py-1.5 px-2.5 text-center font-mono-tabular font-extrabold border-r border-slate-200 ${
                          entry.percentual === 100
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {entry.percentual}%
                      </td>
                      {firstItemsBlock.map((item) => {
                        const st = entry.items[item.id] ?? 'OK';
                        return (
                          <td
                            key={item.id}
                            className={`py-1.5 px-2 text-center font-bold border-r border-slate-200 ${
                              st === 'NOK'
                                ? 'bg-red-100 text-red-700'
                                : st === 'NA'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {st === 'NA' ? 'N/A' : st}
                          </td>
                        );
                      })}
                      {config.midColumnsOrder.map((midCol) => (
                        <td
                          key={midCol}
                          className={`py-1.5 px-2.5 border-r border-slate-200 ${
                            midCol === 'PLACA:'
                              ? 'font-mono-tabular font-extrabold text-[#06295A]'
                              : midCol === 'Nome:'
                                ? 'text-slate-700'
                                : 'font-mono-tabular text-slate-700'
                          }`}
                        >
                          {getMidColumnValue(entry, midCol)}
                        </td>
                      ))}
                      {lastItemsBlock.map((item) => {
                        const st = entry.items[item.id] ?? 'OK';
                        return (
                          <td
                            key={item.id}
                            className={`py-1.5 px-2 text-center font-bold border-r border-slate-200 ${
                              st === 'NOK'
                                ? 'bg-red-100 text-red-700'
                                : st === 'NA'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {st === 'NA' ? 'N/A' : st}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
