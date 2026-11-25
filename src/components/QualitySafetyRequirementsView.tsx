import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  LegalizedDocumentRecord,
  SafetyCheckMonthKey,
  SafetyCheckOperation,
  SafetyCheckRowPayload,
  Vehicle,
} from '../types/fleet';
import {
  SAFETY_CHECK_SEED_ROWS,
  SAFETY_MONTH_COLUMNS,
  SAFETY_OPERATIONS,
  buildSafetyCheckRecord,
  parseSafetyCheckRow,
} from '../data/safetyCheckSeed';
import { PLATFORM_CARD_GRID_CLASS, PlatformCard } from './PlatformCard';
import { BlitzEntregaWorkspace } from './BlitzEntregaWorkspace';

type SheetTab = SafetyCheckOperation;

interface QualitySafetyRequirementsViewProps {
  records: LegalizedDocumentRecord[];
  blitzRecords: LegalizedDocumentRecord[];
  vehicles: Vehicle[];
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

interface ResolvedRow {
  row: SafetyCheckRowPayload;
  isFromDb: boolean;
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

function computeRowYtd(row: SafetyCheckRowPayload): number | null {
  const vals: number[] = [];
  for (const col of SAFETY_MONTH_COLUMNS) {
    const v = row.months[col.key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      vals.push(v);
    }
  }
  if (vals.length === 0) return null;
  const sum = vals.reduce((acc, n) => acc + n, 0);
  return sum / vals.length;
}

function computeSectionMonthAvg(
  rows: SafetyCheckRowPayload[],
  monthKey: SafetyCheckMonthKey
): number | null {
  const vals: number[] = [];
  for (const r of rows) {
    const v = r.months[monthKey];
    if (typeof v === 'number' && Number.isFinite(v)) {
      vals.push(v);
    }
  }
  if (vals.length === 0) return null;
  return vals.reduce((acc, n) => acc + n, 0) / vals.length;
}

function formatPctIntOrDecimal(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '';
  if (Math.abs(val - Math.round(val)) < 0.05) {
    return `${Math.round(val)}%`;
  }
  return `${val.toFixed(1).replace('.', ',')}%`;
}

export const QualitySafetyRequirementsView: React.FC<
  QualitySafetyRequirementsViewProps
> = ({
  records,
  blitzRecords,
  vehicles,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [openedSection, setOpenedSection] = useState<
    'check-seguranca' | 'blitz-entrega' | null
  >(null);
  const [activeTab, setActiveTab] = useState<SheetTab>('ENTREGA');
  const [search, setSearch] = useState('');
  const [userClearedBase, setUserClearedBase] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    monthKey: SafetyCheckMonthKey;
  } | null>(null);
  const [editingInput, setEditingInput] = useState('');

  // Add row modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newOperation, setNewOperation] = useState<SafetyCheckOperation>('ENTREGA');
  const [newUnit, setNewUnit] = useState('GUARABIRA');
  const [newPlate, setNewPlate] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const resolvedRows: ResolvedRow[] = useMemo(() => {
    if (records.length === 0) {
      if (userClearedBase) return [];
      return SAFETY_CHECK_SEED_ROWS.map((row) => ({ row, isFromDb: false }));
    }

    const list: ResolvedRow[] = [];
    for (const rec of records) {
      const parsed = parseSafetyCheckRow(rec.fileDataUrl, {
        id: rec.id,
        operation:
          rec.expiryDate === 'PUXADA' || rec.expiryDate === 'ARMAZÉM'
            ? rec.expiryDate
            : 'ENTREGA',
        unit: rec.referenceDate || 'GUARABIRA',
        plate: rec.plate,
        notes: rec.notes,
      });
      if (parsed) {
        list.push({
          row: { ...parsed, id: rec.id },
          isFromDb: true,
        });
      }
    }

    return list;
  }, [records, userClearedBase]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resolvedRows.filter(({ row }) => {
      if (!q) return true;
      return (
        row.plate.toLowerCase().includes(q) ||
        row.unit.toLowerCase().includes(q) ||
        row.operation.toLowerCase().includes(q)
      );
    });
  }, [resolvedRows, search]);

  const rowsByOperation = useMemo(() => {
    const grouped: Record<SafetyCheckOperation, ResolvedRow[]> = {
      ENTREGA: [],
      PUXADA: [],
      ARMAZÉM: [],
    };
    for (const item of filteredRows) {
      grouped[item.row.operation].push(item);
    }
    return grouped;
  }, [filteredRows]);

  const overallMetrics = useMemo(() => {
    const all = resolvedRows.map((r) => r.row);
    const ytdValues = all
      .map((r) => computeRowYtd(r))
      .filter((v): v is number => v !== null);
    const avgYtd =
      ytdValues.length > 0
        ? ytdValues.reduce((acc, v) => acc + v, 0) / ytdValues.length
        : null;

    let below100Count = 0;
    for (const row of all) {
      for (const col of SAFETY_MONTH_COLUMNS) {
        const val = row.months[col.key];
        if (typeof val === 'number' && val < 100) {
          below100Count += 1;
        }
      }
    }

    return {
      totalRows: all.length,
      entregaCount: all.filter((r) => r.operation === 'ENTREGA').length,
      puxadaCount: all.filter((r) => r.operation === 'PUXADA').length,
      armazemCount: all.filter((r) => r.operation === 'ARMAZÉM').length,
      avgYtd,
      below100Count,
    };
  }, [resolvedRows]);

  const persistRowUpdate = (
    targetRowId: string,
    updater: (row: SafetyCheckRowPayload) => SafetyCheckRowPayload
  ) => {
    if (records.length === 0 && !userClearedBase) {
      // Materialize all seed rows into Firestore applying the requested edit
      const nowDate = new Date().toLocaleDateString('pt-BR');
      const docs = SAFETY_CHECK_SEED_ROWS.map((seedRow) => {
        const nextRow = seedRow.id === targetRowId ? updater(seedRow) : seedRow;
        return buildSafetyCheckRecord(nextRow, nowDate);
      });
      onAddRecords(docs);
      return;
    }

    const existing = resolvedRows.find((r) => r.row.id === targetRowId);
    if (!existing) return;
    const updatedRow = updater(existing.row);
    const built = buildSafetyCheckRecord(updatedRow);
    onUpdateRecord(targetRowId, {
      fileName: built.fileName,
      fileType: built.fileType,
      fileSize: built.fileSize,
      plate: built.plate,
      expiryDate: built.expiryDate,
      referenceDate: built.referenceDate,
      notes: built.notes,
      uploadedAt: built.uploadedAt,
      fileDataUrl: built.fileDataUrl,
    });
  };

  const handleSyncPercentToSafetyCheck = (
    plate: string,
    monthKey: SafetyCheckMonthKey,
    percent: number
  ) => {
    const cleanPlate = plate.replace(/[^A-Z0-9-]/gi, '').toUpperCase().trim();
    const normPlate = cleanPlate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (!normPlate) return;

    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const nowDate = new Date().toLocaleDateString('pt-BR');

    if (records.length === 0 && !userClearedBase) {
      let matchedSeed = false;
      const docs = SAFETY_CHECK_SEED_ROWS.map((seedRow) => {
        const seedNorm = seedRow.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (seedRow.operation === 'ENTREGA' && seedNorm === normPlate) {
          matchedSeed = true;
          return buildSafetyCheckRecord(
            {
              ...seedRow,
              months: { ...seedRow.months, [monthKey]: clamped },
            },
            nowDate
          );
        }
        return buildSafetyCheckRecord(seedRow, nowDate);
      });

      if (!matchedSeed) {
        const plateSlug = normPlate.toLowerCase();
        docs.push(
          buildSafetyCheckRecord(
            {
              id: `cs-entrega-${plateSlug}-${Date.now().toString(36)}`,
              operation: 'ENTREGA',
              unit: 'GUARABIRA',
              plate: cleanPlate,
              months: { [monthKey]: clamped },
            },
            nowDate
          )
        );
      }

      onAddRecords(docs);
      return;
    }

    const existingEntrega = resolvedRows.find(
      (r) =>
        r.row.operation === 'ENTREGA' &&
        r.row.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === normPlate
    );

    if (existingEntrega) {
      persistRowUpdate(existingEntrega.row.id, (row) => ({
        ...row,
        months: { ...row.months, [monthKey]: clamped },
      }));
      return;
    }

    const plateSlug = normPlate.toLowerCase();
    setUserClearedBase(false);
    onAddRecords([
      buildSafetyCheckRecord(
        {
          id: `cs-entrega-${plateSlug}-${Date.now().toString(36)}`,
          operation: 'ENTREGA',
          unit: 'GUARABIRA',
          plate: cleanPlate,
          months: { [monthKey]: clamped },
        },
        nowDate
      ),
    ]);
  };

  const handleStartCellEdit = (
    rowId: string,
    monthKey: SafetyCheckMonthKey,
    currentValue: number | null | undefined
  ) => {
    setEditingCell({ rowId, monthKey });
    setEditingInput(
      currentValue !== null && currentValue !== undefined ? String(currentValue) : ''
    );
  };

  const handleCommitCellEdit = () => {
    if (!editingCell) return;
    const { rowId, monthKey } = editingCell;
    const trimmed = editingInput.replace('%', '').replace(',', '.').trim();
    let parsedVal: number | null = null;
    if (trimmed !== '') {
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        parsedVal = Math.max(0, Math.min(100, Math.round(num)));
      } else {
        setEditingCell(null);
        return;
      }
    }

    const existing = resolvedRows.find((r) => r.row.id === rowId)?.row;
    const currentVal = existing?.months[monthKey] ?? null;
    setEditingCell(null);

    if (currentVal === parsedVal) return;

    persistRowUpdate(rowId, (row) => {
      const nextMonths = { ...row.months };
      if (parsedVal === null) {
        delete nextMonths[monthKey];
      } else {
        nextMonths[monthKey] = parsedVal;
      }
      return { ...row, months: nextMonths };
    });
  };

  const handleDeleteRow = (rowId: string, plate: string) => {
    if (records.length === 0 && !userClearedBase) {
      const remaining = SAFETY_CHECK_SEED_ROWS.filter((r) => r.id !== rowId);
      if (remaining.length === 0) {
        setUserClearedBase(true);
        return;
      }
      const nowDate = new Date().toLocaleDateString('pt-BR');
      onAddRecords(remaining.map((r) => buildSafetyCheckRecord(r, nowDate)));
      showNotice(`Placa ${plate} removida.`);
      return;
    }

    if (records.length === 1) {
      setUserClearedBase(true);
    }
    onDeleteRecord(rowId);
    showNotice(`Placa ${plate} removida do Check de Segurança.`);
  };

  const handleAddNewPlate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = newPlate.replace(/[^A-Z0-9-]/gi, '').toUpperCase().trim();
    if (!cleanPlate) return;
    const cleanUnit = newUnit.trim().toUpperCase() || 'GUARABIRA';

    const alreadyExists = resolvedRows.some(
      (r) =>
        r.row.operation === newOperation &&
        r.row.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() ===
          cleanPlate.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    );
    if (alreadyExists) {
      showNotice(`A placa ${cleanPlate} já consta em ${newOperation}.`);
      setAddModalOpen(false);
      return;
    }

    const opSlug =
      newOperation === 'PUXADA'
        ? 'puxada'
        : newOperation === 'ARMAZÉM'
          ? 'armazem'
          : 'entrega';
    const plateSlug = cleanPlate.replace(/[^A-Z0-9]/gi, '').toLowerCase();
    const newRow: SafetyCheckRowPayload = {
      id: `cs-${opSlug}-${plateSlug}-${Date.now().toString(36)}`,
      operation: newOperation,
      unit: cleanUnit,
      plate: cleanPlate,
      months: {},
    };

    const nowDate = new Date().toLocaleDateString('pt-BR');
    const docsToAdd: LegalizedDocumentRecord[] = [];
    if (records.length === 0 && !userClearedBase) {
      for (const seedRow of SAFETY_CHECK_SEED_ROWS) {
        docsToAdd.push(buildSafetyCheckRecord(seedRow, nowDate));
      }
    }
    docsToAdd.push(buildSafetyCheckRecord(newRow, nowDate));
    setUserClearedBase(false);
    onAddRecords(docsToAdd);
    setNewPlate('');
    setAddModalOpen(false);
    showNotice(`Placa ${cleanPlate} adicionada em ${newOperation}.`);
  };

  const handleImportFleetPlates = () => {
    const existingKeys = new Set(
      resolvedRows.map(
        (r) =>
          `${r.row.operation}:${r.row.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`
      )
    );
    const nowDate = new Date().toLocaleDateString('pt-BR');
    const docsToAdd: LegalizedDocumentRecord[] = [];

    if (records.length === 0 && !userClearedBase) {
      for (const seedRow of SAFETY_CHECK_SEED_ROWS) {
        docsToAdd.push(buildSafetyCheckRecord(seedRow, nowDate));
      }
    }

    let addedCount = 0;
    for (const v of vehicles) {
      const cleanPlate = v.plate.replace(/[^A-Z0-9-]/gi, '').toUpperCase().trim();
      if (!cleanPlate) continue;
      const op = inferSafetyOperation(v);
      const normKey = `${op}:${cleanPlate.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
      if (existingKeys.has(normKey)) continue;
      existingKeys.add(normKey);
      addedCount += 1;

      const opSlug =
        op === 'PUXADA' ? 'puxada' : op === 'ARMAZÉM' ? 'armazem' : 'entrega';
      const plateSlug = cleanPlate.replace(/[^A-Z0-9]/gi, '').toLowerCase();
      docsToAdd.push(
        buildSafetyCheckRecord(
          {
            id: `cs-${opSlug}-${plateSlug}`,
            operation: op,
            unit: 'GUARABIRA',
            plate: cleanPlate,
            months: {},
          },
          nowDate
        )
      );
    }

    if (addedCount === 0) {
      showNotice('Todas as placas da frota já estão listadas no Check de Segurança.');
      return;
    }

    setUserClearedBase(false);
    onAddRecords(docsToAdd);
    showNotice(`${addedCount} placas da frota importadas para o Check de Segurança.`);
  };

  const handleRestoreBase = () => {
    const nowDate = new Date().toLocaleDateString('pt-BR');
    setUserClearedBase(false);
    onAddRecords(SAFETY_CHECK_SEED_ROWS.map((r) => buildSafetyCheckRecord(r, nowDate)));
    showNotice('Base padrão do Check de Segurança restaurada (21 placas).');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const toSheetRow = (row: SafetyCheckRowPayload) => {
      const out: Record<string, string> = {
        OPERAÇÃO: row.unit,
        PLACA: row.plate,
      };
      for (const col of SAFETY_MONTH_COLUMNS) {
        const val = row.months[col.key];
        out[col.label] =
          val !== null && val !== undefined ? `${val}%` : '';
      }
      const ytd = computeRowYtd(row);
      out.YTD = ytd !== null ? formatPctIntOrDecimal(ytd) : '';
      return out;
    };

    const ytdSheetRows: Record<string, string>[] = [];
    for (const opMeta of SAFETY_OPERATIONS) {
      const opRows = resolvedRows
        .filter((r) => r.row.operation === opMeta.key)
        .map((r) => r.row);
      ytdSheetRows.push({ OPERAÇÃO: opMeta.label, PLACA: '' });
      for (const row of opRows) {
        ytdSheetRows.push(toSheetRow(row));
      }
      ytdSheetRows.push({ OPERAÇÃO: '', PLACA: '' });
    }

    const wsYtd = XLSX.utils.json_to_sheet(ytdSheetRows);
    wsYtd['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      ...SAFETY_MONTH_COLUMNS.map(() => ({ wch: 8 })),
      { wch: 9 },
    ];
    XLSX.utils.book_append_sheet(wb, wsYtd, 'YTD');

    for (const opMeta of SAFETY_OPERATIONS) {
      const opRows = resolvedRows
        .filter((r) => r.row.operation === opMeta.key)
        .map((r) => toSheetRow(r.row));
      const ws = XLSX.utils.json_to_sheet(
        opRows.length > 0 ? opRows : [{ OPERAÇÃO: '', PLACA: '' }]
      );
      ws['!cols'] = wsYtd['!cols'];
      XLSX.utils.book_append_sheet(wb, ws, opMeta.blitzTabLabel.slice(0, 31));
    }

    XLSX.writeFile(wb, '1.2.3_Check_de_Seguranca_YTD.xlsx');
    showNotice('Planilha Check de Segurança exportada com sucesso.');
  };

  const visibleOperations = useMemo(() => {
    return SAFETY_OPERATIONS.filter((op) => op.key === activeTab);
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col gap-3.5 py-0.5">
      {openedSection === null ? (
        <>
          <section className="rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1256BA] text-white px-5 py-4 shadow-[0_6px_18px_rgba(11,60,125,0.18)] flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-blue-200/90">
                1.2.3 · QUALIDADE E SEGURANÇA
              </div>
              <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight">
                1.2.3 LISTA DE REQUISITOS - QUALIDADE E SEGURANÇA
              </h2>
              <p className="text-xs text-blue-100/85 mt-0.5">
                Selecione um requisito abaixo para abrir o acompanhamento por operação e placa.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-mono-tabular font-bold">
                {String(overallMetrics.totalRows).padStart(2, '0')} placas ·{' '}
                {String(blitzRecords.length).padStart(2, '0')} blitz ·{' '}
                {overallMetrics.avgYtd !== null
                  ? `YTD ${formatPctIntOrDecimal(overallMetrics.avgYtd)}`
                  : 'YTD —'}
              </div>
            </div>
          </section>

          <section aria-label="Requisitos de Qualidade e Segurança">
            <div className={PLATFORM_CARD_GRID_CLASS}>
              <PlatformCard
                kicker="1.2.3.1 · SEGURANÇA"
                countLabel={`${String(overallMetrics.totalRows).padStart(2, '0')} placas`}
                title="CHECK DE SEGURANÇA"
                subtitle="Acompanhamento mensal YTD de Entrega, Puxada e Armazém (Jan a Dez)"
                onClick={() => {
                  setActiveTab('ENTREGA');
                  setOpenedSection('check-seguranca');
                }}
              />
              <PlatformCard
                kicker="1.2.3.2 · BLITZ DE ENTREGA"
                countLabel={`${String(blitzRecords.length).padStart(2, '0')} blitz`}
                title="BLITZ DE ENTREGA"
                subtitle="Checklist rápido de 55 itens (Cabine, Frente, Baú, Traseira, Pneus e Elétrica) com cálculo de %"
                onClick={() => setOpenedSection('blitz-entrega')}
              />
            </div>
          </section>
        </>
      ) : openedSection === 'blitz-entrega' ? (
        <BlitzEntregaWorkspace
          records={blitzRecords}
          vehicles={vehicles}
          onBack={() => setOpenedSection(null)}
          onAddRecords={onAddRecords}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onSyncPercentToSafetyCheck={handleSyncPercentToSafetyCheck}
        />
      ) : (
        <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
          {/* Navy Header Bar matching screenshot */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setOpenedSection(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-bold text-white cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-[1rem] font-extrabold tracking-wide text-white uppercase truncate">
                    CHECK DE SEGURANÇA
                  </h2>
                  <span className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 rounded bg-white/15 border border-white/25 text-blue-100 shrink-0">
                    {overallMetrics.avgYtd !== null
                      ? `YTD ${formatPctIntOrDecimal(overallMetrics.avgYtd)}`
                      : 'YTD —'}
                  </span>
                </div>
                <p className="text-[0.74rem] text-blue-100/85 mt-0.5 truncate">
                  Entrega, Puxada e Armazém — clique em qualquer mês (Jan a Dez) para editar o percentual.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleImportFleetPlates}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Importar Frota</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewOperation(activeTab);
                  setNewUnit('GUARABIRA');
                  setNewPlate('');
                  setAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#06295A] text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Adicionar Placa</span>
              </button>
            </div>
          </div>

          {/* Sheet Tabs + Search Toolbar */}
          <div className="px-4 py-2 bg-[#F4F8FD] border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex items-center gap-1 overflow-x-auto"
              role="tablist"
              aria-label="Abas do Check de Segurança"
            >
              {SAFETY_OPERATIONS.map((op) => {
                const active = activeTab === op.key;
                const count =
                  op.key === 'ENTREGA'
                    ? overallMetrics.entregaCount
                    : op.key === 'PUXADA'
                      ? overallMetrics.puxadaCount
                      : overallMetrics.armazemCount;
                return (
                  <button
                    key={op.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(op.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0B3C7D] text-white shadow-[0_2px_6px_rgba(11,60,125,0.28)]'
                        : 'text-slate-600 hover:bg-white hover:text-[#06295A]'
                    }`}
                  >
                    {op.label} ({count})
                  </button>
                );
              })}
            </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-56 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar placa ou operação..."
                className="w-full h-8 pl-8 pr-7 rounded-lg bg-white border border-slate-200 text-xs font-medium text-[#06295A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-3 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                100% Conforme
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-400" />
                Abaixo de 100% ({overallMetrics.below100Count})
              </span>
            </div>
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

        {/* Stacked Tables (ENTREGA / PUXADA / ARMAZÉM) */}
        <div className="flex-1 p-4 space-y-6 bg-white">
          {resolvedRows.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm font-bold text-[#06295A]">
                Nenhum registro no Check de Segurança.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Adicione uma placa manualmente, importe da frota ou restaure a base padrão.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreBase}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B3C7D] text-white text-xs font-bold hover:bg-[#1256BA] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Base Padrão (21 placas)</span>
                </button>
              </div>
            </div>
          ) : (
            visibleOperations.map((opMeta) => {
              const sectionItems = rowsByOperation[opMeta.key];
              const sectionRows = sectionItems.map((i) => i.row);
              const sectionYtds = sectionRows
                .map((r) => computeRowYtd(r))
                .filter((v): v is number => v !== null);
              const sectionYtdAvg =
                sectionYtds.length > 0
                  ? sectionYtds.reduce((acc, n) => acc + n, 0) / sectionYtds.length
                  : null;

              return (
                <div key={opMeta.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-[#06295A]">
                        {opMeta.label}
                      </h3>
                      <span className="font-mono-tabular text-[11px] font-semibold text-slate-500">
                        ({sectionRows.length}{' '}
                        {sectionRows.length === 1 ? 'registro' : 'registros'})
                      </span>
                    </div>

                    {sectionYtdAvg !== null && (
                      <span className="font-mono-tabular text-[11px] font-bold text-[#0B3C7D]">
                        Média {opMeta.label}: {formatPctIntOrDecimal(sectionYtdAvg)}
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-300/90 shadow-[0_1px_4px_rgba(6,41,90,0.04)]">
                    <table className="w-full border-collapse text-center text-[11.5px]">
                      <thead>
                        <tr className="bg-[#06295A] text-white font-extrabold tracking-wide">
                          <th className="py-1.5 px-2.5 text-left border-r border-[#16427C] whitespace-nowrap">
                            OPERAÇÃO
                          </th>
                          <th className="py-1.5 px-2.5 text-center border-r border-[#16427C] whitespace-nowrap">
                            PLACA
                          </th>
                          {SAFETY_MONTH_COLUMNS.map((col) => (
                            <th
                              key={col.key}
                              className="py-1.5 px-2 border-r border-[#16427C] min-w-[52px] whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                          <th className="py-1.5 px-2.5 bg-[#0A3775] border-r border-[#16427C] min-w-[58px] whitespace-nowrap">
                            YTD
                          </th>
                          <th className="py-1.5 px-1.5 w-9" aria-label="Ações" />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 bg-white">
                        {sectionItems.length === 0 ? (
                          <tr>
                            <td
                              colSpan={SAFETY_MONTH_COLUMNS.length + 4}
                              className="py-5 text-xs text-slate-400"
                            >
                              Nenhuma placa em {opMeta.label}
                              {search ? ` para "${search}"` : ''}.
                            </td>
                          </tr>
                        ) : (
                          sectionItems.map(({ row }) => {
                            const rowYtd = computeRowYtd(row);
                            return (
                              <tr
                                key={row.id}
                                className="hover:bg-[#F5F9FF] transition-colors"
                              >
                                <td className="py-1 px-2.5 text-left font-bold text-[#06295A] border-r border-slate-200 whitespace-nowrap">
                                  {row.unit}
                                </td>
                                <td className="py-1 px-2.5 font-mono-tabular font-extrabold text-[#06295A] bg-slate-50/70 border-r border-slate-200 whitespace-nowrap">
                                  {row.plate}
                                </td>

                                {SAFETY_MONTH_COLUMNS.map((col) => {
                                  const val = row.months[col.key];
                                  const isEditing =
                                    editingCell?.rowId === row.id &&
                                    editingCell?.monthKey === col.key;

                                  const cellTone =
                                    val === undefined || val === null
                                      ? 'text-slate-300 hover:bg-blue-50/60'
                                      : val >= 100
                                        ? 'text-[#06295A] font-bold hover:bg-blue-50/70'
                                        : val >= 98
                                          ? 'bg-amber-50 text-amber-800 font-extrabold hover:bg-amber-100/80'
                                          : 'bg-red-50 text-red-700 font-extrabold hover:bg-red-100/80';

                                  return (
                                    <td
                                      key={col.key}
                                      className={`p-0 border-r border-slate-200 font-mono-tabular ${cellTone}`}
                                    >
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          autoFocus
                                          value={editingInput}
                                          onChange={(e) => setEditingInput(e.target.value)}
                                          onBlur={handleCommitCellEdit}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleCommitCellEdit();
                                            } else if (e.key === 'Escape') {
                                              e.preventDefault();
                                              setEditingCell(null);
                                            }
                                          }}
                                          aria-label={`${row.plate} ${col.label}`}
                                          className="w-full h-7 px-1 text-center text-[11.5px] font-mono-tabular font-bold text-[#06295A] bg-blue-50 outline-none ring-2 ring-inset ring-[#1565D8]"
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleStartCellEdit(row.id, col.key, val)
                                          }
                                          title={`Editar ${row.plate} (${col.label})`}
                                          className="w-full h-7 px-1.5 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1565D8]"
                                        >
                                          {val !== undefined && val !== null
                                            ? `${val}%`
                                            : ''}
                                        </button>
                                      )}
                                    </td>
                                  );
                                })}

                                <td className="py-1 px-2 font-mono-tabular font-extrabold text-[#06295A] bg-[#EEF4FC] border-r border-slate-200 whitespace-nowrap">
                                  {rowYtd !== null ? formatPctIntOrDecimal(rowYtd) : '—'}
                                </td>

                                <td className="py-0.5 px-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(row.id, row.plate)}
                                    title={`Remover ${row.plate}`}
                                    aria-label={`Remover ${row.plate}`}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {sectionRows.length > 0 && (
                        <tfoot>
                          <tr className="bg-[#F4F8FD] border-t border-slate-300 font-extrabold text-[#06295A]">
                            <td
                              colSpan={2}
                              className="py-1.5 px-2.5 text-left text-[11px] uppercase tracking-wide border-r border-slate-200 whitespace-nowrap"
                            >
                              Média {opMeta.label}
                            </td>
                            {SAFETY_MONTH_COLUMNS.map((col) => {
                              const avg = computeSectionMonthAvg(sectionRows, col.key);
                              return (
                                <td
                                  key={col.key}
                                  className="py-1.5 px-1.5 font-mono-tabular text-[11px] border-r border-slate-200 whitespace-nowrap"
                                >
                                  {avg !== null ? formatPctIntOrDecimal(avg) : ''}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 font-mono-tabular text-[11px] bg-[#DCE8F8] border-r border-slate-200 whitespace-nowrap">
                              {sectionYtdAvg !== null
                                ? formatPctIntOrDecimal(sectionYtdAvg)
                                : '—'}
                            </td>
                            <td className="py-1.5 px-1" />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      )}

      {/* Add Plate Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px] p-4"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-extrabold text-white">
                  Adicionar Placa — Check de Segurança
                </h3>
                <p className="text-xs text-blue-100/85">
                  Vincule um veículo ou equipamento à tabela YTD
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                aria-label="Fechar modal"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewPlate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#06295A] mb-1">
                  Categoria / Tabela *
                </label>
                <select
                  value={newOperation}
                  onChange={(e) =>
                    setNewOperation(e.target.value as SafetyCheckOperation)
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold text-[#06295A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                >
                  <option value="ENTREGA">ENTREGA</option>
                  <option value="PUXADA">PUXADA</option>
                  <option value="ARMAZÉM">ARMAZÉM</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Operação / Base *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value.toUpperCase())}
                    placeholder="GUARABIRA"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Placa / Código *
                  </label>
                  <input
                    type="text"
                    required
                    list="safety-fleet-plates"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="Ex: NPR2601"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono-tabular text-xs font-bold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                  <datalist id="safety-fleet-plates">
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — {v.manufacturerModel}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B3C7D] text-white text-xs font-bold hover:bg-[#1256BA] transition-colors cursor-pointer"
                >
                  Adicionar na Tabela
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
