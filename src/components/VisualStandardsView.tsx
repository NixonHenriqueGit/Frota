import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  MinusCircle,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { PLATFORM_CARD_GRID_CLASS, PlatformCard } from './PlatformCard';
import {
  LegalizedDocumentRecord,
  Vehicle,
  VisualChecklistItemDef,
  VisualCheckItemResponse,
  VisualCheckStatus,
  VisualStandardScope,
  VisualValidationPayload,
} from '../types/fleet';
import {
  VISUAL_MIME_BY_SCOPE,
  VISUAL_STANDARD_DECKS,
  parseVisualValidation,
  serializeVisualValidation,
} from '../data/visualStandardsSeed';
import { normalizeAssetUrl } from '../data/fleetSeed';

interface VisualStandardsViewProps {
  records: LegalizedDocumentRecord[];
  vehicles: Vehicle[];
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

interface ParsedValidationEntry {
  record: LegalizedDocumentRecord;
  scope: VisualStandardScope;
  payload: VisualValidationPayload;
  conformeCount: number;
  bloqueioCount: number;
  naCount: number;
  pendingCount: number;
  totalItems: number;
  outcome: 'CONFORME' | 'BLOQUEIO' | 'PARCIAL';
}

function inferScopeFromRecord(rec: LegalizedDocumentRecord): VisualStandardScope {
  if (
    rec.fileType === VISUAL_MIME_BY_SCOPE.equipamentos ||
    rec.id.startsWith('vp-equip-')
  ) {
    return 'equipamentos';
  }
  return 'frota';
}

function inferModalForVehicle(v: Vehicle, scope: VisualStandardScope): string {
  if (scope === 'equipamentos') {
    const text = `${v.category} ${v.model} ${v.fuelType}`.toUpperCase();
    if (text.includes('GÁS') || text.includes('GAS') || text.includes('GLP')) {
      return 'EMPILHADEIRA MOVIDAS A GÁS';
    }
    return 'EMPILHADEIRA';
  }
  const text = `${v.bodywork} ${v.category} ${v.model}`.toUpperCase();
  if (text.includes('SIDER')) return 'SIDER';
  if (text.includes('VAN') || v.category === 'Frota Leve') return 'VAN';
  if (
    v.category === 'Carga Semi-Reboque' ||
    v.category === 'Tração Caminhão Trator' ||
    v.sector === 'Puxada'
  ) {
    return 'CARRETA / PUXADA';
  }
  return 'BAIADO';
}

function computeSummary(
  scope: VisualStandardScope,
  itemsMap: Record<string, VisualCheckItemResponse>
) {
  const defs = VISUAL_STANDARD_DECKS[scope].items;
  let conformeCount = 0;
  let bloqueioCount = 0;
  let naCount = 0;

  for (const def of defs) {
    const status = itemsMap[def.id]?.status;
    if (status === 'CONFORME') conformeCount += 1;
    else if (status === 'BLOQUEIO') bloqueioCount += 1;
    else if (status === 'NA') naCount += 1;
  }

  const totalItems = defs.length;
  const pendingCount = totalItems - conformeCount - bloqueioCount - naCount;
  const outcome: 'CONFORME' | 'BLOQUEIO' | 'PARCIAL' =
    bloqueioCount > 0
      ? 'BLOQUEIO'
      : pendingCount === 0
        ? 'CONFORME'
        : 'PARCIAL';

  return {
    conformeCount,
    bloqueioCount,
    naCount,
    pendingCount,
    totalItems,
    outcome,
  };
}

function todayBr(): string {
  return new Date().toLocaleDateString('pt-BR');
}

export const VisualStandardsView: React.FC<VisualStandardsViewProps> = ({
  records,
  vehicles,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [activeScope, setActiveScope] = useState<VisualStandardScope | null>(null);
  const [zoomedItem, setZoomedItem] = useState<VisualChecklistItemDef | null>(null);
  const [failedImgIds, setFailedImgIds] = useState<Record<string, boolean>>({});

  // Active validation form state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [assetCode, setAssetCode] = useState<string>('');
  const [modalType, setModalType] = useState<string>('BAIADO');
  const [validatedAt, setValidatedAt] = useState<string>(() => todayBr());
  const [inspector, setInspector] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [itemResponses, setItemResponses] = useState<
    Record<string, VisualCheckItemResponse>
  >({});

  // Filters inside checklist & history
  const [itemSearch, setItemSearch] = useState('');
  const [appFilter, setAppFilter] = useState('TODOS');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    'ALL' | 'PENDENTE' | 'VALIDADO'
  >('ALL');
  const [showGeneralNotes, setShowGeneralNotes] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const parsedEntries: ParsedValidationEntry[] = useMemo(() => {
    return records
      .map((rec) => {
        const scope = inferScopeFromRecord(rec);
        const parsed = parseVisualValidation(rec.fileDataUrl, scope) ?? {
          scope,
          assetLabel: rec.plate || 'SEM IDENTIFICAÇÃO',
          modalType: rec.expiryDate || VISUAL_STANDARD_DECKS[scope].modalOptions[0],
          inspector: '',
          validatedAt: rec.referenceDate || rec.uploadedAt || todayBr(),
          generalNotes: rec.notes || '',
          items: {},
        };
        const summary = computeSummary(scope, parsed.items);
        return {
          record: rec,
          scope,
          payload: parsed,
          ...summary,
        };
      })
      .sort((a, b) => a.payload.assetLabel.localeCompare(b.payload.assetLabel));
  }, [records]);

  const sortedVehicles = useMemo(
    () => [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles]
  );

  const scopeVehicles = useMemo(() => {
    if (activeScope === 'equipamentos') {
      const forklifts = sortedVehicles.filter((v) => v.category === 'Empilhadeira');
      const others = sortedVehicles.filter((v) => v.category !== 'Empilhadeira');
      return [...forklifts, ...others];
    }
    const fleetCars = sortedVehicles.filter((v) => v.category !== 'Empilhadeira');
    const forklifts = sortedVehicles.filter((v) => v.category === 'Empilhadeira');
    return [...fleetCars, ...forklifts];
  }, [sortedVehicles, activeScope]);

  const resetFormForScope = (scope: VisualStandardScope) => {
    setEditingRecordId(null);
    setSelectedVehicleId('');
    setAssetCode('');
    setModalType(VISUAL_STANDARD_DECKS[scope].modalOptions[0]);
    setValidatedAt(todayBr());
    setInspector('');
    setGeneralNotes('');
    setShowGeneralNotes(false);
    setItemResponses({});
    setItemSearch('');
    setAppFilter('TODOS');
    setSaveNotice(null);
  };

  const handleOpenScope = (scope: VisualStandardScope) => {
    setActiveScope(scope);
    resetFormForScope(scope);
    setHistorySearch('');
    setHistoryStatusFilter('ALL');
  };

  const handleLoadEntryIntoForm = (entry: ParsedValidationEntry) => {
    setActiveScope(entry.scope);
    setEditingRecordId(entry.record.id);
    const matchedVeh = vehicles.find(
      (v) =>
        v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() ===
        entry.payload.assetLabel.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    );
    setSelectedVehicleId(matchedVeh?.id ?? '');
    setAssetCode(entry.payload.assetLabel || entry.record.plate);
    setModalType(
      entry.payload.modalType || VISUAL_STANDARD_DECKS[entry.scope].modalOptions[0]
    );
    setValidatedAt(entry.payload.validatedAt || entry.record.referenceDate || todayBr());
    setInspector(entry.payload.inspector || '');
    const loadedNotes = entry.payload.generalNotes || '';
    setGeneralNotes(loadedNotes);
    setShowGeneralNotes(Boolean(loadedNotes));
    setItemResponses({ ...entry.payload.items });
    setSaveNotice(null);
  };

  const handleStartVehicleValidation = (v: Vehicle) => {
    if (!activeScope) return;
    setEditingRecordId(null);
    setSelectedVehicleId(v.id);
    setAssetCode(v.plate.toUpperCase());
    setModalType(inferModalForVehicle(v, activeScope));
    setValidatedAt(todayBr());
    setInspector('');
    setGeneralNotes('');
    setShowGeneralNotes(false);
    setItemResponses({});
    setSaveNotice(null);
  };

  const handleSetItemStatus = (itemId: string, status: VisualCheckStatus) => {
    setItemResponses((prev) => {
      const existing = prev[itemId];
      if (existing?.status === status) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          status,
          note: existing?.note ?? '',
        },
      };
    });
    setSaveNotice(null);
  };

  const handleSetItemNote = (itemId: string, note: string) => {
    setItemResponses((prev) => ({
      ...prev,
      [itemId]: {
        status: prev[itemId]?.status ?? 'BLOQUEIO',
        note,
      },
    }));
  };

  const handleMarkAllVisibleConforme = () => {
    if (!activeScope) return;
    const defs = VISUAL_STANDARD_DECKS[activeScope].items;
    setItemResponses((prev) => {
      const next = { ...prev };
      for (const def of defs) {
        if (appFilter !== 'TODOS' && def.application !== appFilter) continue;
        next[def.id] = {
          status: 'CONFORME',
          note: next[def.id]?.note ?? '',
        };
      }
      return next;
    });
    setSaveNotice(null);
  };

  const handleSaveValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScope) return;

    const cleanAsset = assetCode.trim().toUpperCase();
    if (!cleanAsset) {
      setSaveNotice('Informe a placa do veículo ou código do equipamento antes de salvar.');
      return;
    }

    const payload: VisualValidationPayload = {
      scope: activeScope,
      assetLabel: cleanAsset,
      modalType,
      inspector: inspector.trim(),
      validatedAt: validatedAt.trim() || todayBr(),
      generalNotes: generalNotes.trim(),
      items: itemResponses,
    };

    const summary = computeSummary(activeScope, itemResponses);
    const serialized = serializeVisualValidation(payload);
    const nowDate = todayBr();
    const summaryNote = [
      inspector.trim() ? `Inspetor: ${inspector.trim()}` : '',
      summary.bloqueioCount > 0
        ? `${summary.bloqueioCount} bloqueio(s)`
        : summary.pendingCount === 0
          ? '100% Conforme'
          : `${summary.conformeCount}/${summary.totalItems} verificados`,
      generalNotes.trim(),
    ]
      .filter(Boolean)
      .join(' · ');

    const prefix = activeScope === 'equipamentos' ? 'vp-equip-' : 'vp-frota-';
    const fileLabel =
      activeScope === 'equipamentos'
        ? `VP_ARM_${cleanAsset}`
        : `VP_FROTA_${cleanAsset}`;

    if (editingRecordId) {
      onUpdateRecord(editingRecordId, {
        fileName: fileLabel,
        fileType: VISUAL_MIME_BY_SCOPE[activeScope],
        fileSize: serialized.length,
        plate: cleanAsset.slice(0, 20),
        expiryDate: modalType.slice(0, 40),
        referenceDate: payload.validatedAt.slice(0, 40),
        notes: summaryNote.slice(0, 500),
        uploadedAt: nowDate,
        fileDataUrl: serialized,
      });
      setSaveNotice(`Validação de "${cleanAsset}" atualizada no banco de dados.`);
    } else {
      const newId = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const record: LegalizedDocumentRecord = {
        id: newId,
        folder: 'PADRÕES VISUAIS',
        subfolder: '',
        fileName: fileLabel,
        fileType: VISUAL_MIME_BY_SCOPE[activeScope],
        fileSize: serialized.length,
        plate: cleanAsset.slice(0, 20),
        expiryDate: modalType.slice(0, 40),
        referenceDate: payload.validatedAt.slice(0, 40),
        notes: summaryNote.slice(0, 500),
        uploadedAt: nowDate,
        fileDataUrl: serialized,
      };
      onAddRecords([record]);
      setEditingRecordId(newId);
      setSaveNotice(`Validação de "${cleanAsset}" salva no banco de dados.`);
    }
  };

  const activeDeck = activeScope ? VISUAL_STANDARD_DECKS[activeScope] : null;

  const currentSummary = useMemo(() => {
    if (!activeScope) {
      return {
        conformeCount: 0,
        bloqueioCount: 0,
        naCount: 0,
        pendingCount: 0,
        totalItems: 0,
        outcome: 'PARCIAL' as const,
      };
    }
    return computeSummary(activeScope, itemResponses);
  }, [activeScope, itemResponses]);

  const filteredChecklistItems = useMemo(() => {
    if (!activeDeck) return [];
    const q = itemSearch.trim().toLowerCase();
    return activeDeck.items.filter((item) => {
      if (appFilter !== 'TODOS' && item.application !== appFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.application.toLowerCase().includes(q) ||
        item.anomaly.toLowerCase().includes(q) ||
        String(item.order).includes(q)
      );
    });
  }, [activeDeck, appFilter, itemSearch]);

  const sidebarRoster = useMemo(() => {
    if (!activeScope) return [];
    const norm = (val: string) => val.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const scopedEntries = parsedEntries.filter((e) => e.scope === activeScope);
    const entryByPlate = new Map<string, ParsedValidationEntry>();
    for (const entry of scopedEntries) {
      const key = norm(entry.payload.assetLabel);
      if (key && !entryByPlate.has(key)) {
        entryByPlate.set(key, entry);
      }
    }

    const usedPlates = new Set<string>();
    const rows: {
      key: string;
      vehicle: Vehicle | null;
      entry: ParsedValidationEntry | null;
      plate: string;
      subtitle: string;
      badgeText: string;
      status: 'PENDENTE' | 'CONFORME' | 'BLOQUEIO' | 'PARCIAL';
    }[] = [];

    for (const v of scopeVehicles) {
      const key = norm(v.plate);
      usedPlates.add(key);
      const entry = entryByPlate.get(key) ?? null;
      rows.push({
        key: v.id,
        vehicle: v,
        entry,
        plate: v.plate,
        subtitle: v.manufacturerModel || v.model || v.category,
        badgeText: `${v.category}${v.sector ? ` · ${v.sector}` : ''}`,
        status: entry ? entry.outcome : 'PENDENTE',
      });
    }

    for (const entry of scopedEntries) {
      const key = norm(entry.payload.assetLabel);
      if (usedPlates.has(key)) continue;
      rows.push({
        key: entry.record.id,
        vehicle: null,
        entry,
        plate: entry.payload.assetLabel,
        subtitle: entry.payload.inspector
          ? `Inspetor: ${entry.payload.inspector}`
          : 'Registro manual',
        badgeText: entry.payload.modalType || 'Manual',
        status: entry.outcome,
      });
    }

    const q = historySearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (historyStatusFilter === 'PENDENTE' && row.status !== 'PENDENTE') {
        return false;
      }
      if (historyStatusFilter === 'VALIDADO' && row.status === 'PENDENTE') {
        return false;
      }
      if (!q) return true;
      return (
        row.plate.toLowerCase().includes(q) ||
        row.subtitle.toLowerCase().includes(q) ||
        row.badgeText.toLowerCase().includes(q) ||
        (row.entry?.payload.inspector ?? '').toLowerCase().includes(q)
      );
    });
  }, [activeScope, parsedEntries, scopeVehicles, historySearch, historyStatusFilter]);

  const validatedInScopeCount = useMemo(() => {
    if (!activeScope) return 0;
    return parsedEntries.filter((e) => e.scope === activeScope).length;
  }, [parsedEntries, activeScope]);

  return (
    <div className="flex-1 flex flex-col gap-3.5">
      {activeScope === null ? (
        <>
          {/* Header Banner */}
          <section className="rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1256BA] text-white px-5 py-4 shadow-[0_6px_18px_rgba(11,60,125,0.18)] flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-blue-200/90">
                1.2.2 · INSPEÇÃO DE PADRÃO VISUAL AMBEV
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold tracking-[0.015em] [word-spacing:0.12em]">
                1.2.2 PADRÕES VISUAIS — VALIDAÇÃO DE FROTA E ARMAZÉM
              </h2>
              <p className="text-xs text-blue-100/85 mt-0.5">
                Selecione um dos dois padrões abaixo para validar os itens obrigatórios de cada carro ou equipamento.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-mono-tabular font-bold">
                {String(parsedEntries.length).padStart(2, '0')} validações salvas
              </div>
            </div>
          </section>

          {/* 2 Standard Module Cards (One for each PDF) */}
          <section aria-label="Padrões Visuais Disponíveis">
            <div className={PLATFORM_CARD_GRID_CLASS}>
              {(['frota', 'equipamentos'] as VisualStandardScope[]).map((scope) => {
                const deck = VISUAL_STANDARD_DECKS[scope];

                return (
                  <PlatformCard
                    key={scope}
                    kicker={deck.code}
                    countLabel={`${String(deck.items.length).padStart(2, '0')} itens`}
                    title={deck.title}
                    subtitle={deck.subtitle}
                    onClick={() => handleOpenScope(scope)}
                  />
                );
              })}
            </div>
          </section>
        </>
      ) : (
        activeDeck && (
          <>
            {/* Top Workspace Bar */}
            <section className="rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1256BA] text-white px-4 py-3 shadow-[0_6px_16px_rgba(11,60,125,0.20)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveScope(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-bold text-white cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar aos 2 Cards</span>
                </button>
                <div className="min-w-0">
                  <div className="text-[0.65rem] font-bold uppercase tracking-wider text-blue-200/90">
                    {activeDeck.code} · {activeDeck.items.length} ITENS DE BLOQUEIO
                  </div>
                  <h2 className="font-display text-sm sm:text-base font-bold tracking-[0.015em] [word-spacing:0.12em] truncate">
                    {activeDeck.title}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => resetFormForScope(activeScope)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#06295A] hover:bg-blue-50 text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Nova Validação</span>
                </button>
              </div>
            </section>

            {/* Split Workspace: Left Saved Validations List + Right Visual Checklist Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 flex-1">
              {/* Left Column: Clean Platform Fleet Roster */}
              <aside className="xl:col-span-3 rounded-xl bg-white border border-slate-200/90 flex flex-col overflow-hidden xl:max-h-[960px]">
                <div className="px-4 py-3 border-b border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xs font-bold text-[#06295A]">
                      {activeScope === 'frota'
                        ? 'Frota da Plataforma'
                        : 'Frota e Equipamentos'}
                    </h3>
                    <span className="font-mono-tabular text-[0.72rem] font-bold text-slate-500">
                      {validatedInScopeCount}/{scopeVehicles.length}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Buscar placa ou modelo..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-[#1565D8] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100">
                    {(
                      [
                        { id: 'ALL', label: 'Todos' },
                        { id: 'PENDENTE', label: 'Pendentes' },
                        { id: 'VALIDADO', label: 'Validados' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setHistoryStatusFilter(st.id)}
                        className={`py-1 rounded-md text-[0.7rem] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                          historyStatusFilter === st.id
                            ? 'bg-white text-[#06295A] shadow-xs'
                            : 'text-slate-600 hover:text-[#06295A]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {sidebarRoster.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Nenhum veículo encontrado.
                    </div>
                  ) : (
                    sidebarRoster.map((row) => {
                      const entry = row.entry;
                      const isSelected = entry
                        ? editingRecordId === entry.record.id
                        : Boolean(row.vehicle && !editingRecordId && selectedVehicleId === row.vehicle.id);

                      const handleClickRow = () => {
                        if (entry) {
                          handleLoadEntryIntoForm(entry);
                        } else if (row.vehicle) {
                          handleStartVehicleValidation(row.vehicle);
                        }
                      };

                      return (
                        <div
                          key={row.key}
                          onClick={handleClickRow}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleClickRow();
                            }
                          }}
                          className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-[#EEF4FC] ring-1 ring-inset ring-[#1565D8]/40'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono-tabular text-xs font-extrabold text-[#06295A]">
                                {row.plate}
                              </span>
                              {entry ? (
                                entry.outcome === 'CONFORME' ? (
                                  <span className="text-[0.68rem] font-bold text-emerald-700 whitespace-nowrap">
                                    Conforme
                                  </span>
                                ) : entry.outcome === 'BLOQUEIO' ? (
                                  <span className="text-[0.68rem] font-bold text-rose-700 whitespace-nowrap">
                                    {entry.bloqueioCount} bloqueio(s)
                                  </span>
                                ) : (
                                  <span className="text-[0.68rem] font-bold text-amber-700 whitespace-nowrap">
                                    Parcial
                                  </span>
                                )
                              ) : (
                                <span className="text-[0.68rem] font-medium text-slate-400 whitespace-nowrap">
                                  Pendente
                                </span>
                              )}
                            </div>

                            <div className="text-[0.7rem] text-slate-500 truncate mt-0.5">
                              {row.subtitle} · {row.vehicle ? row.vehicle.category : row.badgeText}
                            </div>
                          </div>

                          {entry && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editingRecordId === entry.record.id) {
                                  resetFormForScope(activeScope);
                                }
                                onDeleteRecord(entry.record.id);
                              }}
                              title="Excluir validação"
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>

              {/* Right Column: Streamlined Visual Verification Sheet */}
              <section className="xl:col-span-9 rounded-xl bg-white border border-slate-200/90 flex flex-col overflow-hidden">
                <form onSubmit={handleSaveValidation} className="flex-1 flex flex-col">
                  {/* Compact Form Header */}
                  <div className="px-4 py-3.5 border-b border-slate-200/80 bg-white space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-display text-sm font-extrabold text-[#06295A]">
                            {assetCode
                              ? `Validação — ${assetCode}`
                              : 'Nova Validação de Padrão Visual'}
                          </h3>
                          <span className="text-[0.72rem] font-mono-tabular text-slate-500">
                            <span className="text-emerald-700 font-bold">
                              {currentSummary.conformeCount} OK
                            </span>
                            {' · '}
                            <span
                              className={
                                currentSummary.bloqueioCount > 0
                                  ? 'text-rose-700 font-bold'
                                  : 'text-slate-500'
                              }
                            >
                              {currentSummary.bloqueioCount} bloq.
                            </span>
                            {' · '}
                            <span>{currentSummary.naCount} N/A</span>
                            {' · '}
                            <span className="text-amber-700 font-semibold">
                              {currentSummary.pendingCount} pendentes
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowGeneralNotes((prev) => !prev)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          {showGeneralNotes ? 'Ocultar obs.' : '+ Observação'}
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>
                            {editingRecordId ? 'Atualizar Validação' : 'Salvar Validação'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {saveNotice && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#0B3C7D] flex items-center justify-between gap-2">
                        <span>{saveNotice}</span>
                        <button
                          type="button"
                          onClick={() => setSaveNotice(null)}
                          className="text-[#0B3C7D] hover:text-[#06295A] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {activeScope === 'frota' ? 'Placa / Código *' : 'Código do Equipamento *'}
                        </label>
                        <input
                          type="text"
                          value={assetCode}
                          onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
                          placeholder={
                            activeScope === 'frota' ? 'Ex: QFX5B21' : 'Ex: EMP-01'
                          }
                          required
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono-tabular font-bold uppercase text-[#06295A] focus:border-[#1565D8] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Modal / Tipo
                        </label>
                        <select
                          value={modalType}
                          onChange={(e) => setModalType(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                        >
                          {activeDeck.modalOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Data
                        </label>
                        <input
                          type="text"
                          value={validatedAt}
                          onChange={(e) => setValidatedAt(e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono-tabular text-slate-900 focus:border-[#1565D8] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Inspetor
                        </label>
                        <input
                          type="text"
                          value={inspector}
                          onChange={(e) => setInspector(e.target.value)}
                          placeholder="Nome do responsável"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                        />
                      </div>
                    </div>

                    {(showGeneralNotes || generalNotes.trim() !== '') && (
                      <div>
                        <input
                          type="text"
                          value={generalNotes}
                          onChange={(e) => setGeneralNotes(e.target.value)}
                          placeholder="Observação geral da inspeção..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Single Clean Checklist Filter & Quick Actions Toolbar */}
                  <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                      <div className="relative flex-1 min-w-[180px] max-w-[240px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Buscar item..."
                          className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                        />
                      </div>

                      <select
                        value={appFilter}
                        onChange={(e) => setAppFilter(e.target.value)}
                        aria-label="Filtrar por aplicação"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#1565D8] focus:outline-none cursor-pointer"
                      >
                        {activeDeck.applicationFilters.map((app) => (
                          <option key={app} value={app}>
                            {app === 'TODOS' ? 'Todas as aplicações' : app}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleMarkAllVisibleConforme}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar Todos Conforme</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemResponses({})}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Checklist Items — 2-Column Visual Reference Card Model */}
                  <div className="flex-1 p-3.5 bg-[#F4F7FB]">
                    {filteredChecklistItems.length === 0 ? (
                      <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
                        Nenhum item de verificação corresponde ao filtro atual.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {filteredChecklistItems.map((item) => {
                          const current = itemResponses[item.id];
                          const status = current?.status;
                          const imgBroken = Boolean(failedImgIds[item.id]);

                          return (
                            <div
                              key={item.id}
                              className={`rounded-xl p-3 flex flex-col gap-2.5 transition-colors border ${
                                status === 'BLOQUEIO'
                                  ? 'bg-rose-50/80 border-rose-400'
                                  : status === 'CONFORME'
                                    ? 'bg-emerald-50/75 border-emerald-400'
                                    : status === 'NA'
                                      ? 'bg-slate-100/90 border-slate-300'
                                      : 'bg-white border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
                              }`}
                            >
                              {/* Top Visual Reference Pair: Photo (Left) + Structured Blue Info Block (Right) */}
                              <div className="flex items-stretch gap-3 min-h-[196px]">
                                {/* Photo Frame */}
                                <button
                                  type="button"
                                  onClick={() => setZoomedItem(item)}
                                  title={`Ampliar foto de referência — ${item.name}`}
                                  className="group relative w-[134px] sm:w-[150px] shrink-0 rounded-xl border-2 border-[#1565D8] bg-[#06295A] shadow-sm overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                                >
                                  {item.imageUrl && !imgBroken ? (
                                    <img
                                      src={normalizeAssetUrl(item.imageUrl)}
                                      alt={`Referência visual: ${item.name}`}
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      onError={() =>
                                        setFailedImgIds((prev) => ({
                                          ...prev,
                                          [item.id]: true,
                                        }))
                                      }
                                      className="w-full h-full object-cover object-center scale-[1.04] transition-transform duration-200 group-hover:scale-[1.08]"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#072B5E] text-blue-100">
                                      <Camera className="w-6 h-6 text-[#60A5FA] mb-1.5" />
                                      <span className="text-[0.66rem] font-semibold leading-tight">
                                        {item.name}
                                      </span>
                                    </div>
                                  )}
                                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#06295A]/90 border border-white/20 text-blue-100 font-mono-tabular text-[0.64rem] font-extrabold shadow-xs">
                                    {String(item.order).padStart(2, '0')}
                                  </span>
                                  <span className="absolute bottom-2 right-2 p-1.5 rounded-md bg-[#06295A]/85 border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </span>
                                </button>

                                {/* Structured Blue Info Card */}
                                <div className="flex-1 min-w-0 flex flex-col rounded-xl overflow-hidden border border-[#1B4A94]/80 bg-gradient-to-br from-[#06295A] via-[#0B3C7D] to-[#1256BA] text-white shadow-sm">
                                  {/* Card Header */}
                                  <div className="px-3 py-2 bg-[#051F47]/65 border-b border-white/15 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-6 h-6 rounded-md bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
                                        <Camera className="w-3.5 h-3.5 text-[#93C5FD]" />
                                      </span>
                                      <span className="font-display text-[0.78rem] font-bold uppercase tracking-[0.02em] [word-spacing:0.16em] leading-tight text-white truncate">
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="font-mono-tabular text-[0.68rem] font-bold text-blue-200/85 shrink-0">
                                      #{String(item.order).padStart(2, '0')}
                                    </span>
                                  </div>

                                  {/* Card Body */}
                                  <div className="flex-1 px-3.5 py-3 flex flex-col justify-between gap-2.5">
                                    {/* Top 2-column Metadata */}
                                    <div className="grid grid-cols-2 gap-2.5 pb-2.5 border-b border-white/15">
                                      <div className="min-w-0">
                                        <div className="text-[0.61rem] font-semibold uppercase tracking-wider text-blue-200/80">
                                          Aplicação
                                        </div>
                                        <div className="text-[0.74rem] font-extrabold text-white uppercase tracking-tight mt-0.5 leading-snug">
                                          {item.application}
                                        </div>
                                      </div>

                                      <div className="min-w-0">
                                        <div className="text-[0.61rem] font-semibold uppercase tracking-wider text-blue-200/80">
                                          Gravidade
                                        </div>
                                        <div
                                          className={`text-[0.72rem] font-extrabold uppercase tracking-tight mt-0.5 leading-snug ${
                                            item.severity.startsWith('QUALIDADE')
                                              ? 'text-sky-300'
                                              : 'text-amber-300'
                                          }`}
                                        >
                                          {item.severity}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bottom Criterion Description */}
                                    <div className="flex-1 flex flex-col justify-center">
                                      <div className="text-[0.61rem] font-semibold uppercase tracking-wider text-blue-200/80 mb-1">
                                        Critério de Bloqueio
                                      </div>
                                      <p className="text-[0.76rem] leading-relaxed font-medium text-blue-50/95">
                                        {item.anomaly}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Validation Action Buttons */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/80">
                                <button
                                  type="button"
                                  onClick={() => handleSetItemStatus(item.id, 'CONFORME')}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[0.72rem] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                                    status === 'CONFORME'
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Conforme</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetItemStatus(item.id, 'BLOQUEIO')}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[0.72rem] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                                    status === 'BLOQUEIO'
                                      ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:text-rose-700'
                                  }`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Bloqueio</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetItemStatus(item.id, 'NA')}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[0.72rem] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                                    status === 'NA'
                                      ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                                  }`}
                                >
                                  <MinusCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>N/A</span>
                                </button>
                              </div>

                              {(status === 'BLOQUEIO' || Boolean(current?.note)) && (
                                <input
                                  type="text"
                                  value={current?.note ?? ''}
                                  onChange={(e) => handleSetItemNote(item.id, e.target.value)}
                                  placeholder="Descreva a não conformidade encontrada neste item..."
                                  className="w-full rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-rose-400 focus:border-rose-500 focus:outline-none"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </form>
              </section>
            </div>
          </>
        )
      )}

      {/* Photo Reference Zoom Modal */}
      {zoomedItem && (
        <div
          onClick={() => setZoomedItem(null)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-[#06295A] border-2 border-[#1565D8] shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-[#0B3C7D] to-[#1565D8] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 shrink-0 text-blue-100" />
                <h3 className="font-display text-sm font-extrabold uppercase truncate">
                  {String(zoomedItem.order).padStart(2, '0')} · {zoomedItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZoomedItem(null)}
                aria-label="Fechar ampliação"
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
              {zoomedItem.imageUrl && !failedImgIds[zoomedItem.id] ? (
                <img
                  src={normalizeAssetUrl(zoomedItem.imageUrl)}
                  alt={`Referência ampliada: ${zoomedItem.name}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] w-auto rounded-lg border-2 border-[#60A5FA] object-contain"
                />
              ) : (
                <div className="w-48 h-60 rounded-lg border-2 border-[#60A5FA] bg-[#072B5E] flex flex-col items-center justify-center text-blue-100 p-4 text-center">
                  <Camera className="w-8 h-8 text-[#60A5FA] mb-2" />
                  <span className="text-xs font-bold">{zoomedItem.name}</span>
                </div>
              )}

              <div className="flex-1 text-center sm:text-left space-y-2.5 text-white">
                <div>
                  <div className="text-[0.68rem] uppercase tracking-wider text-blue-200/80 font-semibold">
                    Aplicação
                  </div>
                  <div className="text-sm font-bold text-white">
                    {zoomedItem.application}
                  </div>
                </div>
                <div>
                  <div className="text-[0.68rem] uppercase tracking-wider text-blue-200/80 font-semibold">
                    Gravidade
                  </div>
                  <div className="text-sm font-bold text-amber-300">
                    {zoomedItem.severity}
                  </div>
                </div>
                <div>
                  <div className="text-[0.68rem] uppercase tracking-wider text-blue-200/80 font-semibold">
                    Critério de Bloqueio / Anomalia
                  </div>
                  <p className="text-xs leading-relaxed text-blue-50/90 mt-0.5">
                    {zoomedItem.anomaly}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
