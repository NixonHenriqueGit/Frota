import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  UploadCloud,
  X,
} from 'lucide-react';
import { LegalizedDocumentRecord, Vehicle } from '../types/fleet';
import { DocumentPreviewContent } from './DocumentPreviewContent';
import { MAX_LEGALIZED_FILE_BYTES } from '../services/fleetFirestore';
import { detectPlateFromFilename } from '../utils/plateMatcher';

const SANITARY_FOLDER = 'LAUDO DE VIGILÂNCIA SANITÁRIA' as const;

interface SanitaryLaudoViewProps {
  records: LegalizedDocumentRecord[];
  vehicles: Vehicle[];
  onAddRecords: (items: LegalizedDocumentRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<LegalizedDocumentRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

function renderFileTypeIcon(fileType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  if (fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
    return <FileImage className="w-4 h-4 text-sky-600 shrink-0" />;
  }
  if (fileType.includes('pdf') || lower.endsWith('.pdf')) {
    return <FileText className="w-4 h-4 text-red-600 shrink-0" />;
  }
  if (/\.(xlsx?|csv)$/i.test(lower)) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
  }
  return <File className="w-4 h-4 text-slate-500 shrink-0" />;
}

export const SanitaryLaudoView: React.FC<SanitaryLaudoViewProps> = ({
  records,
  vehicles,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'fleet'>('files');
  const [search, setSearch] = useState('');
  const [plateFilter, setPlateFilter] = useState<string>('Todas');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const vehicleUploadInputRef = useRef<HTMLInputElement | null>(null);
  const rowAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [vehicleUploadTarget, setVehicleUploadTarget] = useState<Vehicle | null>(null);
  const [rowAttachTarget, setRowAttachTarget] = useState<LegalizedDocumentRecord | null>(null);

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [draftPlate, setDraftPlate] = useState('GERAL');
  const [draftRefDate, setDraftRefDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [draftExpiry, setDraftExpiry] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<LegalizedDocumentRecord | null>(null);
  const [editPlate, setEditPlate] = useState('GERAL');
  const [editRefDate, setEditRefDate] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Inline editing state for Validade & Observação
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineExpiry, setInlineExpiry] = useState('');
  const [inlineNotes, setInlineNotes] = useState('');

  // Preview modal state
  const [previewRecord, setPreviewRecord] = useState<LegalizedDocumentRecord | null>(null);

  const startInlineEdit = (rec: LegalizedDocumentRecord) => {
    setInlineEditingId(rec.id);
    setInlineExpiry(rec.expiryDate || '');
    setInlineNotes(rec.notes || '');
  };

  const saveInlineEdit = (rec: LegalizedDocumentRecord) => {
    onUpdateRecord(rec.id, {
      expiryDate: inlineExpiry.trim(),
      notes: inlineNotes.trim(),
    });
    setInlineEditingId(null);
    setUploadNotice(`Validade e observação de "${rec.fileName}" salvas.`);
    setTimeout(() => setUploadNotice(null), 3000);
  };

  const sortedVehicles = useMemo(
    () => [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles]
  );

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (plateFilter !== 'Todas' && r.plate !== plateFilter) return false;
      if (q) {
        return (
          r.fileName.toLowerCase().includes(q) ||
          r.plate.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          r.referenceDate.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, plateFilter, search]);

  const attachedFilesCount = useMemo(
    () => records.filter((r) => Boolean(r.fileDataUrl)).length,
    [records]
  );

  const latestRefDate = useMemo(() => {
    const first = records[0];
    return first?.referenceDate || first?.uploadedAt || '17/07/2026';
  }, [records]);

  const vehiclesWithAlvaraCount = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          Boolean(v.expiryDates.alvaraSanitario) &&
          v.expiryDates.alvaraSanitario !== 'Não informado' &&
          v.expiryDates.alvaraSanitario !== 'N/A'
      ).length,
    [vehicles]
  );

  const handleQuickUploadFiles = async (
    fileList: FileList | File[],
    forcedPlate?: string
  ) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const nowDate = new Date().toLocaleDateString('pt-BR');
    const created: LegalizedDocumentRecord[] = [];
    const oversizedNames: string[] = [];

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      if (file.size > MAX_LEGALIZED_FILE_BYTES) {
        oversizedNames.push(file.name);
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      const detectedPlate = forcedPlate || detectPlateFromFilename(file.name, vehicles);
      created.push({
        id: `laudo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        folder: SANITARY_FOLDER,
        subfolder: '',
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        plate: detectedPlate,
        expiryDate: '',
        referenceDate: nowDate,
        notes: '',
        uploadedAt: nowDate,
        fileDataUrl: dataUrl,
      });
    }

    if (oversizedNames.length > 0) {
      setUploadNotice(
        `Arquivo(s) acima do limite de 15 MB não enviado(s): ${oversizedNames.join(', ')}.`
      );
    } else {
      setUploadNotice(null);
    }

    if (created.length > 0) {
      onAddRecords(created);
    }
  };

  const handleOpenAddModal = () => {
    setDraftPlate('GERAL');
    setDraftRefDate(new Date().toLocaleDateString('pt-BR'));
    setDraftExpiry('');
    setDraftNotes('');
    setDraftFiles([]);
    setAddModalOpen(true);
  };

  const handleSubmitAddModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      const nowDate = new Date().toLocaleDateString('pt-BR');
      const created: LegalizedDocumentRecord[] = [];
      const oversizedNames: string[] = [];
      for (let idx = 0; idx < draftFiles.length; idx++) {
        const file = draftFiles[idx];
        if (file.size > MAX_LEGALIZED_FILE_BYTES) {
          oversizedNames.push(file.name);
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        created.push({
          id: `laudo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          folder: SANITARY_FOLDER,
          subfolder: '',
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          fileSize: file.size,
          plate: draftPlate || 'GERAL',
          expiryDate: draftExpiry.trim(),
          referenceDate: draftRefDate.trim() || nowDate,
          notes: draftNotes.trim(),
          uploadedAt: nowDate,
          fileDataUrl: dataUrl,
        });
      }
      if (oversizedNames.length > 0) {
        setUploadNotice(
          `Arquivo(s) acima do limite de 15 MB não enviado(s): ${oversizedNames.join(', ')}.`
        );
      } else {
        setUploadNotice(null);
      }
      if (created.length > 0) {
        onAddRecords(created);
      }
      setActiveTab('files');
      setAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (rec: LegalizedDocumentRecord) => {
    if (!rec.fileDataUrl) return;
    let href = rec.fileDataUrl;
    let revokeUrl: string | null = null;
    try {
      if (rec.fileDataUrl.startsWith('data:')) {
        const commaIdx = rec.fileDataUrl.indexOf(',');
        const meta = rec.fileDataUrl.slice(0, commaIdx);
        const payload = rec.fileDataUrl.slice(commaIdx + 1);
        const mimeMatch = /^data:([^;]+)/.exec(meta);
        const mime = mimeMatch?.[1] || rec.fileType || 'application/pdf';
        if (meta.includes(';base64')) {
          const binary = atob(payload);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mime });
          revokeUrl = URL.createObjectURL(blob);
          href = revokeUrl;
        }
      }
    } catch {
      // Fallback to direct data URL
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = rec.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (revokeUrl) {
      setTimeout(() => URL.revokeObjectURL(revokeUrl!), 4000);
    }
  };

  const fleetRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedVehicles
      .filter((v) => {
        if (plateFilter !== 'Todas' && v.plate !== plateFilter) return false;
        if (q) {
          return (
            v.plate.toLowerCase().includes(q) ||
            v.manufacturerModel.toLowerCase().includes(q) ||
            v.sector.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((v) => {
        const attached = records.filter(
          (r) =>
            r.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() ===
            v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase()
        );
        return {
          vehicle: v,
          alvara: v.expiryDates.alvaraSanitario || 'Não informado',
          attached,
        };
      });
  }, [sortedVehicles, plateFilter, search, records]);

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Hidden File Inputs */}
      <input
        ref={quickFileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleQuickUploadFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <input
        ref={vehicleUploadInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && vehicleUploadTarget) {
            void handleQuickUploadFiles(e.target.files, vehicleUploadTarget.plate);
          }
          e.target.value = '';
          setVehicleUploadTarget(null);
        }}
      />

      <input
        ref={rowAttachInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && rowAttachTarget) {
            if (file.size > MAX_LEGALIZED_FILE_BYTES) {
              setUploadNotice(
                `O arquivo "${file.name}" excede o limite de 15 MB suportado pelo banco de dados.`
              );
              e.target.value = '';
              setRowAttachTarget(null);
              return;
            }
            setUploadNotice(null);
            const dataUrl = await readFileAsDataUrl(file);
            const nowDate = new Date().toLocaleDateString('pt-BR');
            onUpdateRecord(rowAttachTarget.id, {
              fileName: file.name,
              fileType: file.type || 'application/pdf',
              fileSize: file.size,
              fileDataUrl: dataUrl,
              uploadedAt: nowDate,
              notes:
                rowAttachTarget.notes.includes('clique em Anexar') ||
                rowAttachTarget.notes.includes('Aguardando')
                  ? 'Laudo da Vigilância Sanitária anexado'
                  : rowAttachTarget.notes,
            });
          }
          e.target.value = '';
          setRowAttachTarget(null);
        }}
      />

      {/* Compact Summary Strip */}
      <section
        aria-label="Resumo do Laudo de Vigilância Sanitária"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
      >
        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Documentos do Laudo
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              {attachedFilesCount} de {records.length}{' '}
              {records.length === 1 ? 'arquivo carregado' : 'arquivos carregados'}
            </div>
          </div>
          <span className="font-mono-tabular text-xl font-extrabold text-[#06295A] shrink-0">
            {String(records.length).padStart(2, '0')}
          </span>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Referência Oficial
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Última modificação registrada
            </div>
          </div>
          <span className="font-mono-tabular text-sm font-extrabold text-[#0B3C7D] shrink-0">
            {latestRefDate}
          </span>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Alvará Sanitário na Frota
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Veículos com registro sanitário
            </div>
          </div>
          <span className="font-mono-tabular text-sm font-extrabold text-[#06295A] shrink-0">
            {vehiclesWithAlvaraCount} / {vehicles.length}
          </span>
        </div>
      </section>

      {/* Main Workspace Card */}
      <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[0.92rem] font-bold text-white tracking-tight truncate">
              LAUDO DE VIGILÂNCIA SANITÁRIA
            </h2>
            <p className="text-[0.71rem] text-blue-100/90 truncate">
              Armazenamento, visualização e controle do Laudo da Vigilância Sanitária e alvarás da frota
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#051D43]/70 border border-white/15">
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'files'
                    ? 'bg-white text-[#06295A] shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Arquivos do Laudo ({filteredRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'fleet'
                    ? 'bg-white text-[#06295A] shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Alvará por Veículo ({vehicles.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#06295A] hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Anexar Laudo</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar laudo, placa ou observação..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
              />
            </div>

            <select
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              aria-label="Filtrar por placa"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#1565D8] focus:outline-none"
            >
              <option value="Todas">Todas as Placas</option>
              <option value="GERAL">GERAL (Unidade / Frota)</option>
              {sortedVehicles.map((v) => (
                <option key={v.id} value={v.plate}>
                  {v.plate} — {v.manufacturerModel}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => quickFileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1565D8]/40 bg-blue-50/70 hover:bg-blue-100/70 text-[#0B3C7D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Enviar PDF / Arquivo</span>
          </button>
        </div>

        {/* Workspace Content */}
        {activeTab === 'files' ? (
          <div className="flex-1 flex flex-col">
            {uploadNotice && (
              <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
                <span>{uploadNotice}</span>
                <button
                  type="button"
                  onClick={() => setUploadNotice(null)}
                  className="text-amber-700 hover:text-amber-900 cursor-pointer"
                  aria-label="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Drag & Drop Upload Strip */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void handleQuickUploadFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => quickFileInputRef.current?.click()}
              className={`mx-4 mt-3 mb-2 rounded-xl border-2 border-dashed px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#1565D8] bg-blue-50'
                  : 'border-slate-200 bg-slate-50/60 hover:border-[#60A5FA] hover:bg-blue-50/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#E6F0FD] text-[#1565D8] flex items-center justify-center shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#06295A] truncate">
                    Arraste e solte o arquivo{' '}
                    <span className="text-[#1565D8]">LAUDO DA VIGILÂNCIA.pdf</span> ou outros laudos aqui
                  </p>
                  <p className="text-[0.71rem] text-slate-500 truncate">
                    Suporta PDF e imagens (JPG/PNG). Se o nome coincidir com o registro pré-cadastrado, o arquivo é vinculado automaticamente.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[0.72rem] font-semibold text-[#06295A] shrink-0 whitespace-nowrap">
                Selecionar arquivo
              </span>
            </div>

            {/* Files Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Arquivo</th>
                    <th className="py-2.5 px-3">Vínculo</th>
                    <th className="py-2.5 px-3">Data Ref.</th>
                    <th className="py-2.5 px-3">Validade</th>
                    <th className="py-2.5 px-3">Observação</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-4 text-center">
                        <div className="max-w-sm mx-auto space-y-2">
                          <FileText className="w-9 h-9 text-slate-300 mx-auto" />
                          <p className="text-sm font-bold text-[#06295A]">
                            Nenhum laudo cadastrado ainda
                          </p>
                          <p className="text-xs text-slate-500">
                            Clique em <strong>Anexar Laudo</strong> ou arraste o PDF do{' '}
                            <strong>Laudo da Vigilância Sanitária</strong> para esta área.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-blue-50/35 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderFileTypeIcon(rec.fileType, rec.fileName)}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#06295A] truncate max-w-[260px]">
                                  {rec.fileName}
                                </span>
                                {!rec.fileDataUrl && (
                                  <span className="text-[0.68rem] font-semibold text-amber-700 shrink-0">
                                    · Aguardando PDF
                                  </span>
                                )}
                              </div>
                              <div className="text-[0.68rem] text-slate-500 font-mono-tabular">
                                {formatBytes(rec.fileSize)} ·{' '}
                                {rec.fileDataUrl
                                  ? `Anexado em ${rec.uploadedAt}`
                                  : `Modificado em ${rec.referenceDate || rec.uploadedAt}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono-tabular font-bold text-[#06295A] text-[0.73rem]">
                          {rec.plate || 'GERAL'}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {rec.referenceDate || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {inlineEditingId === rec.id ? (
                            <input
                              type="text"
                              value={inlineExpiry}
                              onChange={(e) => setInlineExpiry(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(rec);
                                if (e.key === 'Escape') setInlineEditingId(null);
                              }}
                              placeholder="DD/MM/AAAA"
                              aria-label="Editar validade"
                              className="w-28 h-7 px-2 rounded border border-[#1565D8] bg-white text-xs font-mono text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]/25"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => startInlineEdit(rec)}
                              title="Clique para editar validade"
                              className="text-left hover:text-[#1565D8] hover:underline cursor-pointer"
                            >
                              {rec.expiryDate || '—'}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-[260px]">
                          {inlineEditingId === rec.id ? (
                            <input
                              type="text"
                              value={inlineNotes}
                              onChange={(e) => setInlineNotes(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(rec);
                                if (e.key === 'Escape') setInlineEditingId(null);
                              }}
                              placeholder="Adicionar observação..."
                              aria-label="Editar observação"
                              className="w-full min-w-[160px] h-7 px-2 rounded border border-[#1565D8] bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/25"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => startInlineEdit(rec)}
                              title={rec.notes ? `${rec.notes} (clique para editar)` : 'Clique para adicionar observação'}
                              className="text-left truncate block w-full hover:text-[#1565D8] hover:underline cursor-pointer"
                            >
                              {rec.notes || '—'}
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {inlineEditingId === rec.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveInlineEdit(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[0.71rem] font-bold cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Salvar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditingId(null)}
                                  title="Cancelar edição"
                                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startInlineEdit(rec)}
                                  title="Editar validade e observação"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-[#EAF2FD] hover:border-[#1565D8]/40 text-[#06295A] text-[0.71rem] font-semibold cursor-pointer mr-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                {rec.fileDataUrl ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewRecord(rec)}
                                      title="Visualizar arquivo"
                                      className="p-1.5 rounded-md text-[#1565D8] hover:bg-blue-50 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(rec)}
                                      title="Baixar arquivo"
                                      className="p-1.5 rounded-md text-slate-600 hover:text-[#06295A] hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRowAttachTarget(rec);
                                        rowAttachInputRef.current?.click();
                                      }}
                                      title="Substituir arquivo"
                                      className="p-1.5 rounded-md text-slate-600 hover:text-[#06295A] hover:bg-slate-100 cursor-pointer"
                                    >
                                      <UploadCloud className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRowAttachTarget(rec);
                                      rowAttachInputRef.current?.click();
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0B3C7D] hover:bg-[#1565D8] text-white text-[0.71rem] font-semibold cursor-pointer mr-1"
                                  >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    <span>Anexar PDF</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(rec);
                                    setEditPlate(rec.plate || 'GERAL');
                                    setEditRefDate(rec.referenceDate);
                                    setEditExpiry(rec.expiryDate);
                                    setEditNotes(rec.notes);
                                  }}
                                  title="Editar todos os detalhes"
                                  className="p-1.5 rounded-md text-slate-600 hover:text-[#06295A] hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRecord(rec.id)}
                                  title="Excluir registro"
                                  className="p-1.5 rounded-md text-red-500 hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Fleet Sanitary License Tab */
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Placa</th>
                  <th className="py-2.5 px-3">Veículo</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3">Alvará Vigilância Sanitária</th>
                  <th className="py-2.5 px-3">Laudos Anexados</th>
                  <th className="py-2.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleetRows.map(({ vehicle: v, alvara, attached }) => (
                  <tr key={v.id} className="hover:bg-blue-50/35 transition-colors">
                    <td className="py-2.5 px-4 font-mono-tabular font-bold text-[#06295A] whitespace-nowrap">
                      {v.plate}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        {v.manufacturerModel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {v.sector}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {alvara}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {attached.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPlateFilter(v.plate);
                            setActiveTab('files');
                          }}
                          className="inline-flex items-center gap-1 text-emerald-700 text-[0.72rem] font-semibold hover:underline cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {attached.length}{' '}
                            {attached.length === 1 ? 'anexo' : 'anexos'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[0.72rem]">
                          Laudo geral da unidade
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleUploadTarget(v);
                          vehicleUploadInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-[#1565D8] text-xs font-semibold text-[#06295A] hover:bg-blue-50/60 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#1565D8]" />
                        <span>Anexar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#06295A] text-white">
              <h3 className="font-display text-sm font-bold text-white">
                Anexar em 1.1.4 Laudo de Vigilância Sanitária
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vínculo (Unidade ou Placa)
                </label>
                <select
                  value={draftPlate}
                  onChange={(e) => setDraftPlate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:border-[#1565D8] focus:outline-none"
                >
                  <option value="GERAL">GERAL (Laudo da Unidade / Frota)</option>
                  {sortedVehicles.map((v) => (
                    <option key={v.id} value={v.plate}>
                      {v.plate} — {v.manufacturerModel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Referência
                  </label>
                  <input
                    type="text"
                    value={draftRefDate}
                    onChange={(e) => setDraftRefDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono-tabular focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validade (opcional)
                  </label>
                  <input
                    type="text"
                    value={draftExpiry}
                    onChange={(e) => setDraftExpiry(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono-tabular focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Ex.: Laudo sanitário anual emitido pela Vigilância Municipal"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arquivo(s) *
                </label>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setDraftFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1565D8] bg-slate-50 hover:bg-blue-50/40 p-4 text-center transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-6 h-6 text-[#1565D8] mx-auto mb-1" />
                  {draftFiles.length === 0 ? (
                    <span className="block text-xs font-semibold text-slate-700">
                      Clique para selecionar o PDF ou imagem do Laudo
                    </span>
                  ) : (
                    <span className="block text-xs font-bold text-[#06295A]">
                      {draftFiles.length}{' '}
                      {draftFiles.length === 1
                        ? `arquivo selecionado: ${draftFiles[0].name}`
                        : 'arquivos selecionados'}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={draftFiles.length === 0 || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#06295A] hover:bg-[#0B3C7D] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Laudo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#06295A] text-white">
              <h3 className="font-display text-sm font-bold text-white truncate">
                Editar Registro — {editingRecord.fileName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateRecord(editingRecord.id, {
                  plate: editPlate || 'GERAL',
                  referenceDate: editRefDate.trim(),
                  expiryDate: editExpiry.trim(),
                  notes: editNotes.trim(),
                });
                setEditingRecord(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vínculo (Unidade ou Placa)
                </label>
                <select
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white"
                >
                  <option value="GERAL">GERAL (Unidade / Frota)</option>
                  {sortedVehicles.map((v) => (
                    <option key={v.id} value={v.plate}>
                      {v.plate} — {v.manufacturerModel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Ref.
                  </label>
                  <input
                    type="text"
                    value={editRefDate}
                    onChange={(e) => setEditRefDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validade
                  </label>
                  <input
                    type="text"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observação
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06295A] text-white text-xs font-semibold cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-4xl h-[85vh] rounded-xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-[#06295A] text-white shrink-0">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-white truncate">
                  {previewRecord.fileName}
                </h3>
                <p className="text-[0.7rem] text-blue-100">
                  1.1.4 Laudo de Vigilância Sanitária · {previewRecord.plate || 'GERAL'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewRecord)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-auto">
              <DocumentPreviewContent
                fileDataUrl={previewRecord.fileDataUrl}
                fileName={previewRecord.fileName}
                fileType={previewRecord.fileType}
                fileSize={previewRecord.fileSize}
                onDownload={() => handleDownload(previewRecord)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
