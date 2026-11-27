import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  BlitzItemStatus,
  ComplianceMonth,
  LegalizedDocumentRecord,
  PuxadaCheckPayload,
  PuxadaZoneKey,
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
  PUXADA_COLUMNS,
  PUXADA_MONTH_ABBR,
  PUXADA_SEED_ROWS,
  PUXADA_ZONES,
  buildPuxadaRecord,
  computePuxadaPercent,
  createPuxadaAllOkMap,
  parsePuxadaRecord,
} from '../data/puxadaCheckSeed';
import { SAFETY_CHECK_SEED_ROWS } from '../data/safetyCheckSeed';

interface PuxadaCheckWorkspaceProps {
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

function getGravidadeBadgeClass(gravidade: string): string {
  const upper = gravidade.toUpperCase();
  if (upper.includes('BLOQUEIO IMEDIATO')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (upper.includes('GRAVE')) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  if (upper.includes('MÉDIO') || upper.includes('MEDIO')) {
    return 'bg-sky-100 text-sky-800 border-sky-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export const PuxadaCheckWorkspace: React.FC<PuxadaCheckWorkspaceProps> = ({
  records,
  vehicles,
  onBack,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
  onSyncPercentToSafetyCheck,
}) => {
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form');
  const [selectedMes, setSelectedMes] = useState<ComplianceMonth>(() =>
    getCurrentComplianceMonth()
  );
  const [userClearedJanSeed, setUserClearedJanSeed] = useState(false);

  // Quick check form state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [placa, setPlaca] = useState('');
  const [dataStr, setDataStr] = useState(() => nowDateBr());
  const [responsavel, setResponsavel] = useState('');
  const [momento, setMomento] = useState<StratifiedProblemMoment>('Saída');
  const [itemsMap, setItemsMap] = useState<Record<string, BlitzItemStatus>>(() =>
    createPuxadaAllOkMap()
  );
  const [activeStageKey, setActiveStageKey] = useState<PuxadaZoneKey | null>(null);
  const [completedZones, setCompletedZones] = useState<Record<string, boolean>>({});
  const [showNokOnly, setShowNokOnly] = useState(false);
  const [manualPlateMode, setManualPlateMode] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 3800);
  };

  // Parse persisted records; if none exist in DB and user hasn't cleared seed, show January seed
  const allResolvedEntries: { payload: PuxadaCheckPayload; isFromDb: boolean }[] =
    useMemo(() => {
      if (records.length === 0) {
        if (userClearedJanSeed) return [];
        return PUXADA_SEED_ROWS.map((payload) => ({
          payload,
          isFromDb: false,
        }));
      }

      const list: { payload: PuxadaCheckPayload; isFromDb: boolean }[] = [];
      for (const rec of records) {
        const parsed = parsePuxadaRecord(rec.fileDataUrl, rec.id);
        if (parsed) {
          list.push({
            payload: { ...parsed, id: rec.id },
            isFromDb: true,
          });
        }
      }
      return list;
    }, [records, userClearedJanSeed]);

  // Puxada plates pool (from PUXADA seed + Puxada / Cavalo / Carreta registered in fleet)
  const puxadaPlates = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    for (const seed of SAFETY_CHECK_SEED_ROWS) {
      if (seed.operation === 'PUXADA') {
        const clean = seed.plate.toUpperCase().trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    }

    for (const v of vehicles) {
      if (
        v.sector === 'Puxada' ||
        v.category === 'Tração Caminhão Trator' ||
        v.category === 'Carga Semi-Reboque'
      ) {
        const clean = v.plate.toUpperCase().trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    }

    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [vehicles]);

  const monthEntries = useMemo(() => {
    return allResolvedEntries.filter((e) => e.payload.mes === selectedMes);
  }, [allResolvedEntries, selectedMes]);

  const filteredTableEntries = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return monthEntries;
    return monthEntries.filter(
      (e) =>
        e.payload.placa.toLowerCase().includes(q) ||
        e.payload.responsavel.toLowerCase().includes(q)
    );
  }, [monthEntries, tableSearch]);

  const inspectedInMonthMap = useMemo(() => {
    const map = new Map<string, { payload: PuxadaCheckPayload; isFromDb: boolean }>();
    for (const entry of monthEntries) {
      const norm = entry.payload.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (!map.has(norm)) {
        map.set(norm, entry);
      }
    }
    return map;
  }, [monthEntries]);

  const monthAvgPercent = useMemo(() => {
    if (monthEntries.length === 0) return null;
    const sum = monthEntries.reduce((acc, e) => acc + e.payload.percentual, 0);
    return sum / monthEntries.length;
  }, [monthEntries]);

  const liveStats = useMemo(() => computePuxadaPercent(itemsMap), [itemsMap]);

  const materializeSeedExcept = (skipId?: string): PuxadaCheckPayload[] => {
    if (records.length > 0) return [];
    const created: LegalizedDocumentRecord[] = [];
    const payloads: PuxadaCheckPayload[] = [];
    for (const seed of PUXADA_SEED_ROWS) {
      if (seed.id === skipId) continue;
      const rec = buildPuxadaRecord({ ...seed, id: '' });
      created.push(rec);
      payloads.push({ ...seed, id: rec.id });
    }
    if (created.length > 0) {
      onAddRecords(created);
    }
    return payloads;
  };

  const resetFormForPlate = (nextPlate = '') => {
    setEditingRecordId(null);
    setPlaca(nextPlate);
    setDataStr(nowDateBr());
    setMomento('Saída');
    setItemsMap(createPuxadaAllOkMap());
    setActiveStageKey(null);
    setCompletedZones({});
    setShowNokOnly(false);
    setManualPlateMode(false);
    setItemSearch('');
  };

  const loadEntryIntoForm = (entry: {
    payload: PuxadaCheckPayload;
    isFromDb: boolean;
  }) => {
    setSelectedMes(entry.payload.mes);
    setEditingRecordId(entry.isFromDb ? entry.payload.id : null);
    setPlaca(entry.payload.placa);
    setDataStr(entry.payload.data || nowDateBr());
    setResponsavel(entry.payload.responsavel || '');
    setMomento(entry.payload.momento === 'Retorno' ? 'Retorno' : 'Saída');
    setItemsMap({ ...createPuxadaAllOkMap(), ...entry.payload.items });
    setActiveStageKey(PUXADA_ZONES[0]?.key ?? null);
    setCompletedZones({});
    setShowNokOnly(false);
    setItemSearch('');
    setViewMode('form');
  };

  const handleSelectPlate = (plate: string) => {
    setManualPlateMode(false);
    const norm = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const existing = inspectedInMonthMap.get(norm);
    if (existing) {
      loadEntryIntoForm(existing);
    } else {
      resetFormForPlate(plate);
    }
  };

  const pendingPuxadaPlates = useMemo(
    () =>
      puxadaPlates.filter((p) => {
        const norm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return !inspectedInMonthMap.has(norm);
      }),
    [puxadaPlates, inspectedInMonthMap]
  );

  const completedPuxadaPlates = useMemo(
    () =>
      puxadaPlates.filter((p) => {
        const norm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return inspectedInMonthMap.has(norm);
      }),
    [puxadaPlates, inspectedInMonthMap]
  );

  const handleSelectNextPending = () => {
    const currentNorm = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const next =
      pendingPuxadaPlates.find(
        (p) => p.replace(/[^A-Z0-9]/gi, '').toUpperCase() !== currentNorm
      ) ?? pendingPuxadaPlates[0];
    if (next) {
      handleSelectPlate(next);
    } else {
      showNotice(
        `Todas as ${puxadaPlates.length} placas da Puxada já foram verificadas em ${selectedMes}.`
      );
    }
  };

  const handleSaveInspection = (advanceNext: boolean) => {
    const cleanPlate = placa.trim().toUpperCase();
    if (!cleanPlate) {
      showNotice('Informe ou selecione a PLACA da Puxada antes de salvar.');
      return;
    }

    const stats = computePuxadaPercent(itemsMap);
    const normPlate = cleanPlate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const existingForPlate = inspectedInMonthMap.get(normPlate);

    if (records.length === 0 && !userClearedJanSeed) {
      materializeSeedExcept(existingForPlate?.payload.id);
    }

    const targetDbId =
      editingRecordId ?? (existingForPlate?.isFromDb ? existingForPlate.payload.id : '');

    const payload: PuxadaCheckPayload = {
      id: targetDbId,
      mes: selectedMes,
      placa: cleanPlate,
      data: dataStr.trim() || nowDateBr(),
      responsavel: responsavel.trim(),
      percentual: stats.percent,
      momento,
      items: { ...itemsMap },
    };

    const rec = buildPuxadaRecord(payload);
    if (targetDbId) {
      onUpdateRecord(targetDbId, {
        fileName: rec.fileName,
        fileType: rec.fileType,
        fileSize: rec.fileSize,
        plate: rec.plate,
        expiryDate: rec.expiryDate,
        referenceDate: rec.referenceDate,
        notes: rec.notes,
        uploadedAt: rec.uploadedAt,
        fileDataUrl: rec.fileDataUrl,
      });
    } else {
      onAddRecords([rec]);
    }

    onSyncPercentToSafetyCheck(
      'PUXADA',
      cleanPlate,
      monthToSafetyKey(selectedMes),
      stats.percent
    );

    if (advanceNext) {
      const nextUnchecked = puxadaPlates.find((p) => {
        const pNorm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return pNorm !== normPlate && !inspectedInMonthMap.has(pNorm);
      });
      resetFormForPlate(nextUnchecked ?? '');
      showNotice(
        `Check de ${cleanPlate} (${stats.percent}%) salvo e atualizado em Check de Segurança (PUXADA).`
      );
    } else {
      setEditingRecordId(targetDbId || rec.id);
      showNotice(
        `Check de ${cleanPlate} (${stats.percent}%) salvo e atualizado em Check de Segurança (PUXADA).`
      );
    }
  };

  const handleToggleMatrixCell = (
    entry: { payload: PuxadaCheckPayload; isFromDb: boolean },
    colId: string
  ) => {
    const current = entry.payload.items[colId] ?? 'OK';
    const nextStatus: BlitzItemStatus = current === 'NOK' ? 'OK' : 'NOK';
    const nextItems: Record<string, BlitzItemStatus> = {
      ...entry.payload.items,
      [colId]: nextStatus,
    };
    const stats = computePuxadaPercent(nextItems);

    const updatedPayload: PuxadaCheckPayload = {
      ...entry.payload,
      percentual: stats.percent,
      items: nextItems,
    };

    if (!entry.isFromDb && records.length === 0) {
      materializeSeedExcept(entry.payload.id);
      const rec = buildPuxadaRecord({ ...updatedPayload, id: '' });
      onAddRecords([rec]);
    } else {
      const rec = buildPuxadaRecord(updatedPayload);
      onUpdateRecord(entry.payload.id, {
        fileName: rec.fileName,
        fileSize: rec.fileSize,
        notes: rec.notes,
        uploadedAt: rec.uploadedAt,
        fileDataUrl: rec.fileDataUrl,
      });
    }

    onSyncPercentToSafetyCheck(
      'PUXADA',
      entry.payload.placa,
      monthToSafetyKey(entry.payload.mes),
      stats.percent
    );
  };

  const handleInitializeMonth = () => {
    if (records.length === 0 && !userClearedJanSeed && selectedMes !== 'JANEIRO') {
      materializeSeedExcept();
    }

    const existingPlates = new Set(
      monthEntries.map((e) => e.payload.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    );

    const toAdd: LegalizedDocumentRecord[] = [];
    for (const p of puxadaPlates) {
      const norm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (existingPlates.has(norm)) continue;
      const items = createPuxadaAllOkMap();
      const rec = buildPuxadaRecord({
        id: '',
        mes: selectedMes,
        placa: p,
        data: nowDateBr(),
        responsavel: responsavel.trim(),
        percentual: 100,
        items,
      });
      toAdd.push(rec);
      onSyncPercentToSafetyCheck('PUXADA', p, monthToSafetyKey(selectedMes), 100);
    }

    if (toAdd.length === 0) {
      showNotice(`Todas as ${puxadaPlates.length} placas já estão em ${selectedMes}.`);
      return;
    }

    setUserClearedJanSeed(false);
    onAddRecords(toAdd);
    showNotice(
      `${toAdd.length} conjunto(s) de Puxada gerados em ${selectedMes} com 100% (Tudo OK).`
    );
  };

  const handleDeleteEntry = (entry: {
    payload: PuxadaCheckPayload;
    isFromDb: boolean;
  }) => {
    if (!entry.isFromDb && records.length === 0) {
      const seeded = materializeSeedExcept(entry.payload.id);
      if (seeded.length === 0) {
        setUserClearedJanSeed(true);
      }
      showNotice(`Placa ${entry.payload.placa} removida de ${entry.payload.mes}.`);
      return;
    }

    if (records.length === 1 && records[0].id === entry.payload.id) {
      setUserClearedJanSeed(true);
    }
    onDeleteRecord(entry.payload.id);
    if (editingRecordId === entry.payload.id) {
      resetFormForPlate('');
    }
    showNotice(`Placa ${entry.payload.placa} removida de ${entry.payload.mes}.`);
  };

  const handleExportExcel = () => {
    const abbr = PUXADA_MONTH_ABBR[selectedMes];
    const rowTipo: (string | number)[] = [
      `PLACA - ${abbr}`,
      'TIPO',
      ...PUXADA_COLUMNS.map((c) => c.tipo),
      '% DE CONFORMIDADES',
    ];
    const rowItens: (string | number)[] = [
      '',
      'ITENS',
      ...PUXADA_COLUMNS.map((c) => c.item),
      '',
    ];
    const rowClass: (string | number)[] = [
      '',
      'CLASSIFICAÇÃO',
      ...PUXADA_COLUMNS.map((c) => c.classificacao),
      '',
    ];
    const rowGrav: (string | number)[] = [
      '',
      'GRAVIDADE',
      ...PUXADA_COLUMNS.map((c) => c.gravidade),
      '',
    ];

    const dataRows = filteredTableEntries.map(({ payload }) => [
      payload.placa,
      '',
      ...PUXADA_COLUMNS.map((c) => payload.items[c.id] ?? 'OK'),
      `${payload.percentual}%`,
    ]);

    const aoa = [rowTipo, rowItens, rowClass, rowGrav, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 16 },
      ...PUXADA_COLUMNS.map(() => ({ wch: 24 })),
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `PUXADA_${abbr}`);
    XLSX.writeFile(wb, `1.2.3_Puxada_${abbr}.xlsx`);
    showNotice(`Planilha PUXADA (${abbr}) exportada com 73 colunas.`);
  };

  const activeStageIndex = useMemo(
    () => PUXADA_ZONES.findIndex((z) => z.key === activeStageKey),
    [activeStageKey]
  );

  const completedStagesCount = useMemo(
    () => PUXADA_ZONES.filter((z) => completedZones[z.key]).length,
    [completedZones]
  );

  const searchMatchingCols = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return [];
    return PUXADA_COLUMNS.filter(
      (c) =>
        c.item.toLowerCase().includes(q) ||
        c.classificacao.toLowerCase().includes(q) ||
        c.gravidade.toLowerCase().includes(q) ||
        c.tipo.toLowerCase().includes(q)
    );
  }, [itemSearch]);

  const handleStartStage = (zoneKey: PuxadaZoneKey) => {
    setShowNokOnly(false);
    setItemSearch('');
    setActiveStageKey(zoneKey);
  };

  const handleCompleteStageAndAdvance = () => {
    if (!activeStageKey) return;
    setCompletedZones((prev) => ({ ...prev, [activeStageKey]: true }));
    const idx = PUXADA_ZONES.findIndex((z) => z.key === activeStageKey);
    if (idx >= 0 && idx + 1 < PUXADA_ZONES.length) {
      setActiveStageKey(PUXADA_ZONES[idx + 1].key);
    } else {
      setActiveStageKey(null);
      showNotice(
        `Todas as ${PUXADA_ZONES.length} etapas concluídas (${liveStats.percent}%). Clique em "Salvar" para finalizar.`
      );
    }
  };

  const monthAbbr = PUXADA_MONTH_ABBR[selectedMes];

  return (
    <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Navy Top Header */}
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display text-[1rem] font-bold tracking-[0.02em] [word-spacing:0.12em] text-white uppercase truncate">
                PUXADA
              </h2>
              <span className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 rounded bg-white/15 border border-white/25 text-blue-100 shrink-0">
                {monthEntries.length} placas ({monthAbbr})
                {monthAvgPercent !== null
                  ? ` · Média ${Math.round(monthAvgPercent)}%`
                  : ''}
              </span>
            </div>
            <p className="text-[0.74rem] text-blue-100/85 mt-0.5 truncate">
              Check completo de 73 itens (Cabine, Frontal, Sider, Plataforma Elevatória, Traseira, Pneus e Itens Extras).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedMes}
            onChange={(e) => setSelectedMes(e.target.value as ComplianceMonth)}
            aria-label="Selecionar mês"
            className="h-8 px-2.5 rounded-lg bg-white/15 border border-white/25 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
          >
            {BLITZ_MONTHS.map((m) => (
              <option key={m.month} value={m.month} className="text-slate-900">
                {m.month}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#051D43]/70 border border-white/15">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'form'
                  ? 'bg-white text-[#06295A] shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Check Rápido</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-[#06295A] shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Planilha 73 Cols ({monthEntries.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleInitializeMonth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Gerar Frota ({monthAbbr})</span>
          </button>

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
        <div className="flex-1 flex flex-col bg-[#F6F9FE]">
          {/* Organized Vehicle Selector + Clean Metadata */}
          <div className="p-4 bg-white border-b border-slate-200/90 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#06295A]">
                    1. Puxada / Placa ({monthAbbr}) *
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setManualPlateMode((prev) => !prev)}
                      className="text-[10.5px] font-bold text-[#1256BA] hover:underline cursor-pointer"
                    >
                      {manualPlateMode ? 'Escolher da lista' : 'Digitar outra placa'}
                    </button>
                    {editingRecordId && (
                      <button
                        type="button"
                        onClick={() => resetFormForPlate('')}
                        className="text-[10.5px] font-bold text-[#1565D8] hover:underline cursor-pointer"
                      >
                        + Nova Placa
                      </button>
                    )}
                  </div>
                </div>

                {manualPlateMode ? (
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    placeholder="Ex: RLT5J44"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono-tabular text-xs font-extrabold uppercase text-[#06295A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                ) : (
                  <select
                    value={puxadaPlates.includes(placa) ? placa : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSelectPlate(e.target.value);
                      } else {
                        resetFormForPlate('');
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono-tabular text-xs font-bold text-[#06295A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8] cursor-pointer"
                  >
                    <option value="">
                      Selecione uma placa ({pendingPuxadaPlates.length} pendentes)...
                    </option>
                    {pendingPuxadaPlates.length > 0 && (
                      <optgroup label={`Pendentes em ${monthAbbr} (${pendingPuxadaPlates.length})`}>
                        {pendingPuxadaPlates.map((p) => (
                          <option key={p} value={p}>
                            {p} — Pendente
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {completedPuxadaPlates.length > 0 && (
                      <optgroup label={`Verificados em ${monthAbbr} (${completedPuxadaPlates.length})`}>
                        {completedPuxadaPlates.map((p) => {
                          const norm = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                          const inspected = inspectedInMonthMap.get(norm);
                          return (
                            <option key={p} value={p}>
                              {p} — ✓ {inspected?.payload.percentual ?? 100}%
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              <div className="md:col-span-6 flex items-center">
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

            {/* Date, Responsible, Moment & Live % Card */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#06295A] mb-1">
                  Data
                </label>
                <input
                  type="text"
                  value={dataStr}
                  onChange={(e) => setDataStr(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 font-mono-tabular text-xs font-semibold text-[#06295A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#06295A] mb-1">
                  Responsável / Inspetor
                </label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#06295A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#06295A] mb-1">
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

              <div
                className={`h-9 px-3 rounded-lg border flex items-center justify-between gap-2 ${
                  liveStats.percent >= 100
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : liveStats.percent >= 90
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-300 text-red-800'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wide">
                  % Conformidade
                </span>
                <span className="font-mono-tabular text-sm font-extrabold">
                  {liveStats.percent}%{' '}
                  <span className="text-[10.5px] font-semibold opacity-80">
                    ({liveStats.nokCount} NOK)
                  </span>
                </span>
              </div>
            </div>

            {/* Stage Summary, Search & Quick Save Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-[#06295A]">
                  Etapas do Check ({completedStagesCount}/{PUXADA_ZONES.length} concluídas)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setItemSearch('');
                    setShowNokOnly((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    showNokOnly
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Só NOK ({liveStats.nokCount})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Filtrar item..."
                    className="w-full h-8 pl-8 pr-6 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40"
                  />
                  {itemSearch && (
                    <button
                      type="button"
                      onClick={() => setItemSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setItemsMap(createPuxadaAllOkMap())}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tudo OK</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveInspection(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#0B3C7D] bg-white hover:bg-blue-50 text-[#0B3C7D] text-xs font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveInspection(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <span>Salvar & Próximo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Stage-by-Stage Guided Inspection */}
          <div className="flex-1 p-4 bg-[#F6F9FE] grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <aside className="lg:col-span-4 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(6,41,90,0.04)] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#06295A] text-white flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide">
                  Etapas da Inspeção
                </span>
                <span className="font-mono-tabular text-[11px] font-bold text-blue-200">
                  {completedStagesCount}/{PUXADA_ZONES.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {PUXADA_ZONES.map((zone, idx) => {
                  const zoneCols = PUXADA_COLUMNS.filter((c) => c.zone === zone.key);
                  const nokCount = zoneCols.filter((c) => itemsMap[c.id] === 'NOK').length;
                  const isActive =
                    !showNokOnly && !itemSearch.trim() && activeStageKey === zone.key;
                  const isDone = Boolean(completedZones[zone.key]);
                  const isFirstSuggested =
                    !activeStageKey && !showNokOnly && !itemSearch.trim() && !isDone && idx === 0;

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
                        <div className="text-xs font-extrabold text-[#06295A] truncate">
                          {zone.label}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="font-mono-tabular text-slate-500 font-semibold">
                            {zoneCols.length} itens
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

            <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(6,41,90,0.04)] overflow-hidden">
              {itemSearch.trim() ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-[#06295A]">
                      Resultados para "{itemSearch.trim()}" ({searchMatchingCols.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setItemSearch('')}
                      className="text-xs font-bold text-[#1256BA] hover:underline cursor-pointer"
                    >
                      Limpar busca
                    </button>
                  </div>
                  {searchMatchingCols.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Nenhum item encontrado para "{itemSearch.trim()}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {searchMatchingCols.map((col) => {
                        const val = itemsMap[col.id] ?? 'OK';
                        return (
                          <div
                            key={col.id}
                            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                              val === 'NOK'
                                ? 'bg-red-50 border-red-300'
                                : val === 'NA'
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-[11.5px] font-bold text-[#06295A] leading-snug">
                                {col.item}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9.5px] font-bold text-slate-700">
                                  {col.classificacao}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold ${getGravidadeBadgeClass(
                                    col.gravidade
                                  )}`}
                                >
                                  {col.gravidade}
                                </span>
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1 shrink-0">
                              {(['OK', 'NOK', 'NA'] as BlitzItemStatus[]).map((st) => {
                                const active = val === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() =>
                                      setItemsMap((prev) => ({ ...prev, [col.id]: st }))
                                    }
                                    className={`px-2 py-1 rounded text-[10.5px] font-extrabold border cursor-pointer ${
                                      active
                                        ? st === 'OK'
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : st === 'NOK'
                                            ? 'bg-red-600 border-red-600 text-white'
                                            : 'bg-slate-600 border-slate-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:text-[#06295A]'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : showNokOnly ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-red-700">
                      Itens Marcados como NOK ({liveStats.nokCount})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNokOnly(false);
                        if (!activeStageKey && PUXADA_ZONES[0]) {
                          setActiveStageKey(PUXADA_ZONES[0].key);
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
                        Nenhum item com NOK neste veículo ({liveStats.percent}% de conformidade).
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PUXADA_COLUMNS.filter((c) => itemsMap[c.id] === 'NOK').map((col) => (
                        <div
                          key={col.id}
                          className="p-2.5 rounded-lg border bg-red-50/80 border-red-300 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[11.5px] font-bold text-red-950 leading-snug">
                              {col.item}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="px-1.5 py-0.5 rounded bg-white border border-red-200 text-[9.5px] font-bold text-slate-700">
                                {col.classificacao}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold ${getGravidadeBadgeClass(
                                  col.gravidade
                                )}`}
                              >
                                {col.gravidade}
                              </span>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1 shrink-0">
                            {(['OK', 'NOK', 'NA'] as BlitzItemStatus[]).map((st) => {
                              const active = itemsMap[col.id] === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setItemsMap((prev) => ({ ...prev, [col.id]: st }))
                                  }
                                  className={`px-2 py-1 rounded text-[10.5px] font-extrabold border cursor-pointer ${
                                    active
                                      ? st === 'OK'
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : st === 'NOK'
                                          ? 'bg-red-600 border-red-600 text-white'
                                          : 'bg-slate-600 border-slate-600 text-white'
                                      : 'bg-white border-slate-200 text-slate-500 hover:text-[#06295A]'
                                  }`}
                                >
                                  {st}
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
                  const zone = PUXADA_ZONES[activeStageIndex];
                  const cols = PUXADA_COLUMNS.filter((c) => c.zone === zone.key);
                  const zoneNoks = cols.filter((c) => itemsMap[c.id] === 'NOK').length;
                  const nextZone = PUXADA_ZONES[activeStageIndex + 1] ?? null;
                  const prevZone =
                    activeStageIndex > 0 ? PUXADA_ZONES[activeStageIndex - 1] : null;

                  return (
                    <div className="flex flex-col">
                      <div className="px-4 py-3 bg-[#F4F8FD] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1256BA]">
                            Etapa {activeStageIndex + 1} de {PUXADA_ZONES.length}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold uppercase tracking-wide ${zone.headerBg}`}
                            >
                              {zone.shortLabel}
                            </span>
                            <h3 className="font-display text-sm font-extrabold uppercase text-[#06295A]">
                              {zone.label}{' '}
                              <span className="font-mono-tabular text-xs font-semibold text-slate-500">
                                ({cols.length} itens{zoneNoks > 0 ? ` · ${zoneNoks} NOK` : ''})
                              </span>
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setItemsMap((prev) => {
                              const next = { ...prev };
                              for (const c of cols) next[c.id] = 'OK';
                              return next;
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-bold text-emerald-700 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Marcar Etapa Tudo OK</span>
                        </button>
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cols.map((col) => {
                          const val = itemsMap[col.id] ?? 'OK';
                          return (
                            <div
                              key={col.id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                                val === 'NOK'
                                  ? 'bg-red-50/80 border-red-300'
                                  : val === 'NA'
                                    ? 'bg-slate-50 border-slate-200'
                                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[11.5px] font-bold text-[#06295A] leading-snug">
                                  {col.item}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9.5px] font-bold text-slate-700">
                                    {col.classificacao}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold ${getGravidadeBadgeClass(
                                      col.gravidade
                                    )}`}
                                  >
                                    {col.gravidade}
                                  </span>
                                </div>
                              </div>

                              <div className="inline-flex items-center gap-1 shrink-0">
                                {(['OK', 'NOK', 'NA'] as BlitzItemStatus[]).map((st) => {
                                  const active = val === st;
                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() =>
                                        setItemsMap((prev) => ({
                                          ...prev,
                                          [col.id]: st,
                                        }))
                                      }
                                      className={`px-2 py-1 rounded text-[10.5px] font-extrabold border cursor-pointer transition-all ${
                                        active
                                          ? st === 'OK'
                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                            : st === 'NOK'
                                              ? 'bg-red-600 border-red-600 text-white'
                                              : 'bg-slate-600 border-slate-600 text-white'
                                          : 'bg-white border-slate-200 text-slate-500 hover:text-[#06295A]'
                                      }`}
                                    >
                                      {st}
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
                    {completedStagesCount === PUXADA_ZONES.length
                      ? 'Todas as etapas finalizadas'
                      : 'Check Guiado por Etapa'}
                  </div>
                  <h3 className="font-display text-base font-extrabold text-[#06295A]">
                    {completedStagesCount === PUXADA_ZONES.length
                      ? `Checklist completo (${liveStats.percent}% de conformidade)`
                      : `Primeiro passo: ${PUXADA_ZONES[0]?.label ?? 'Iniciar Check'}`}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {completedStagesCount === PUXADA_ZONES.length
                      ? `Todas as ${PUXADA_ZONES.length} etapas foram revisadas. Clique em "Salvar" acima ou em "Revisar" ao lado de qualquer etapa.`
                      : 'Clique em "Iniciar" ao lado de cada etapa à esquerda para fazer os checks por seção, começando pela Cabine.'}
                  </p>
                  {completedStagesCount < PUXADA_ZONES.length && PUXADA_ZONES[0] && (
                    <button
                      type="button"
                      onClick={() => handleStartStage(PUXADA_ZONES[0].key)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar {PUXADA_ZONES[0].label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 73-Column Spreadsheet Matrix View matching image_d91b3730.png */
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F4F8FD] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar placa..."
                className="w-full h-8 pl-8 pr-7 rounded-lg bg-white border border-slate-200 text-xs font-medium text-[#06295A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <span>Clique em qualquer célula para alternar OK / NOK</span>
              <button
                type="button"
                onClick={() => {
                  resetFormForPlate('');
                  setViewMode('form');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B3C7D] text-white text-xs font-bold hover:bg-[#1256BA] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Placa</span>
              </button>
            </div>
          </div>

          {filteredTableEntries.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-bold text-[#06295A]">
                Nenhum check registrado para {selectedMes}.
              </p>
              <p className="text-xs text-slate-500">
                Clique abaixo para gerar as {puxadaPlates.length} placas da Puxada com Tudo OK ou lance individualmente no Check Rápido.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleInitializeMonth}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3C7D] text-white text-xs font-bold hover:bg-[#1256BA] cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Gerar Frota de {monthAbbr} ({puxadaPlates.length} placas)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetFormForPlate('');
                    setViewMode('form');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-[#06295A] text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lançar Manualmente</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="border-collapse text-center text-[11px] min-w-max">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th
                      rowSpan={4}
                      className="sticky left-0 z-30 bg-[#009944] text-white font-extrabold px-3 py-2 border border-slate-700/40 min-w-[105px] whitespace-nowrap"
                    >
                      PLACA - {monthAbbr}
                    </th>
                    <th className="sticky left-[105px] z-30 bg-[#009944] text-white font-extrabold px-2.5 py-1 border border-slate-700/40 min-w-[115px] whitespace-nowrap">
                      TIPO
                    </th>
                    {PUXADA_COLUMNS.map((col) => {
                      const zMeta = PUXADA_ZONES.find((z) => z.key === col.zone);
                      return (
                        <th
                          key={`${col.id}-tipo`}
                          className={`${zMeta?.headerBg ?? 'bg-[#0B3C7D] text-white'} font-bold px-2 py-1 border border-slate-900/25 whitespace-nowrap`}
                        >
                          {col.tipo}
                        </th>
                      );
                    })}
                    <th
                      rowSpan={4}
                      className="sticky right-0 z-30 bg-[#FFC000] text-[#111827] font-extrabold px-3 py-2 border border-slate-700/40 min-w-[138px] whitespace-nowrap"
                    >
                      % DE CONFORMIDADES
                    </th>
                    <th
                      rowSpan={4}
                      className="bg-[#06295A] text-white font-bold px-2 py-1 border border-slate-700/40 w-10"
                      aria-label="Remover"
                    />
                  </tr>

                  <tr>
                    <th className="sticky left-[105px] z-30 bg-[#009944] text-white font-extrabold px-2.5 py-1 border border-slate-700/40 whitespace-nowrap">
                      ITENS
                    </th>
                    {PUXADA_COLUMNS.map((col) => {
                      const zMeta = PUXADA_ZONES.find((z) => z.key === col.zone);
                      return (
                        <th
                          key={`${col.id}-item`}
                          className={`${zMeta?.headerBg ?? 'bg-[#0B3C7D] text-white'} font-extrabold px-2 py-1 border border-slate-900/25 whitespace-nowrap`}
                        >
                          {col.item}
                        </th>
                      );
                    })}
                  </tr>

                  <tr>
                    <th className="sticky left-[105px] z-30 bg-[#009944] text-white font-extrabold px-2.5 py-1 border border-slate-700/40 whitespace-nowrap">
                      CLASSIFICAÇÃO
                    </th>
                    {PUXADA_COLUMNS.map((col) => {
                      const zMeta = PUXADA_ZONES.find((z) => z.key === col.zone);
                      return (
                        <th
                          key={`${col.id}-class`}
                          className={`${zMeta?.headerBg ?? 'bg-[#0B3C7D] text-white'} font-semibold px-2 py-1 border border-slate-900/25 whitespace-nowrap`}
                        >
                          {col.classificacao}
                        </th>
                      );
                    })}
                  </tr>

                  <tr>
                    <th className="sticky left-[105px] z-30 bg-[#009944] text-white font-extrabold px-2.5 py-1 border border-slate-700/40 whitespace-nowrap">
                      GRAVIDADE
                    </th>
                    {PUXADA_COLUMNS.map((col) => {
                      const zMeta = PUXADA_ZONES.find((z) => z.key === col.zone);
                      return (
                        <th
                          key={`${col.id}-grav`}
                          className={`${zMeta?.headerBg ?? 'bg-[#0B3C7D] text-white'} font-bold px-2 py-1 border border-slate-900/25 whitespace-nowrap`}
                        >
                          {col.gravidade}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredTableEntries.map((entry, idx) => {
                    const { payload } = entry;
                    const zebra = idx % 2 === 1 ? 'bg-slate-100/90' : 'bg-white';
                    const is100 = payload.percentual >= 100;

                    return (
                      <tr key={payload.id} className={zebra}>
                        <td className="sticky left-0 z-10 bg-inherit font-mono-tabular font-extrabold text-[#06295A] px-2.5 py-1 border border-slate-300 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => loadEntryIntoForm(entry)}
                            title={`Abrir ${payload.placa} no Check Rápido`}
                            className="hover:text-[#1565D8] hover:underline cursor-pointer"
                          >
                            {payload.placa}
                          </button>
                        </td>
                        <td className="sticky left-[105px] z-10 bg-inherit px-2 py-1 border border-slate-300 text-[10px] text-slate-400 whitespace-nowrap">
                          {payload.data || ''}
                        </td>

                        {PUXADA_COLUMNS.map((col) => {
                          const st = payload.items[col.id] ?? 'OK';
                          return (
                            <td
                              key={`${payload.id}-${col.id}`}
                              className={`p-0 border border-slate-300 ${
                                st === 'NOK'
                                  ? 'bg-[#FF0000] text-white font-extrabold'
                                  : st === 'NA'
                                    ? 'bg-slate-200 text-slate-600 font-bold'
                                    : 'text-slate-900 font-bold hover:bg-blue-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleMatrixCell(entry, col.id)}
                                title={`${payload.placa} · ${col.item} (${col.classificacao} / ${col.gravidade}) — clique para alternar OK/NOK`}
                                className="w-full h-6 px-2 flex items-center justify-center cursor-pointer"
                              >
                                {st}
                              </button>
                            </td>
                          );
                        })}

                        <td
                          className={`sticky right-0 z-10 px-2.5 py-1 border border-slate-300 font-mono-tabular font-extrabold whitespace-nowrap ${
                            is100
                              ? 'bg-[#63BE7B] text-[#06295A]'
                              : 'bg-[#F8696B] text-slate-950'
                          }`}
                        >
                          <span className="inline-flex items-center justify-between gap-2 w-full">
                            {is100 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-900 shrink-0" />
                            )}
                            <span className="mx-auto">{payload.percentual}%</span>
                          </span>
                        </td>

                        <td className="px-1 py-0.5 border border-slate-300 bg-inherit">
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry)}
                            title={`Excluir check de ${payload.placa}`}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
