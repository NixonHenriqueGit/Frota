import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Edit3,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react';
import { LegalizedDocumentRecord } from '../types/fleet';
import { DocumentPreviewContent } from './DocumentPreviewContent';
import { MAX_LEGALIZED_FILE_BYTES } from '../services/fleetFirestore';

const EQUIPMENT_FOLDER = 'PADRÕES DE EQUIPAMENTOS' as const;

interface EquipmentStandardsViewProps {
  records: LegalizedDocumentRecord[];
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

function getFileTypeLabel(fileType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (/\.docx?$/i.test(lower) || fileType.includes('wordprocessingml') || fileType.includes('msword')) {
    return lower.endsWith('.doc') ? 'Word (.doc)' : 'Word (.docx)';
  }
  if (fileType.includes('pdf') || lower.endsWith('.pdf')) {
    return 'PDF';
  }
  if (/\.(xlsx?|csv)$/i.test(lower)) {
    return 'Planilha';
  }
  if (fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
    return 'Imagem';
  }
  return 'Documento';
}

function renderFileTypeIcon(fileType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  if (/\.docx?$/i.test(lower) || fileType.includes('wordprocessingml') || fileType.includes('msword')) {
    return <FileText className="w-4 h-4 text-[#1565D8] shrink-0" />;
  }
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

export const EquipmentStandardsView: React.FC<EquipmentStandardsViewProps> = ({
  records,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const rowAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [rowAttachTarget, setRowAttachTarget] = useState<LegalizedDocumentRecord | null>(null);

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [draftRefDate, setDraftRefDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [draftExpiry, setDraftExpiry] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<LegalizedDocumentRecord | null>(null);
  const [editRefDate, setEditRefDate] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Preview modal state
  const [previewRecord, setPreviewRecord] = useState<LegalizedDocumentRecord | null>(null);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (!q) return true;
      return (
        r.fileName.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.referenceDate.toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  const attachedFilesCount = useMemo(
    () => records.filter((r) => Boolean(r.fileDataUrl)).length,
    [records]
  );

  const latestRefDate = useMemo(() => {
    const first = records[0];
    return first?.referenceDate || first?.uploadedAt || '—';
  }, [records]);

  const handleQuickUploadFiles = async (fileList: FileList | File[]) => {
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
      created.push({
        id: `equip-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        folder: EQUIPMENT_FOLDER,
        subfolder: '',
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        plate: 'GERAL',
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
          id: `equip-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          folder: EQUIPMENT_FOLDER,
          subfolder: '',
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          plate: 'GERAL',
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
        const mime = mimeMatch?.[1] || rec.fileType || 'application/octet-stream';
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

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Hidden File Inputs */}
      <input
        ref={quickFileInputRef}
        type="file"
        multiple
        accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleQuickUploadFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <input
        ref={rowAttachInputRef}
        type="file"
        accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
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
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size,
              fileDataUrl: dataUrl,
              uploadedAt: nowDate,
            });
          }
          e.target.value = '';
          setRowAttachTarget(null);
        }}
      />

      {/* Compact Summary Strip */}
      <section
        aria-label="Resumo de Padrões de Equipamentos"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
      >
        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Documentos Anexados
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
              Última Referência
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Data registrada mais recente
            </div>
          </div>
          <span className="font-mono-tabular text-sm font-extrabold text-[#0B3C7D] shrink-0">
            {latestRefDate}
          </span>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Formatos Aceitos
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Word (.docx/.doc), PDF, Excel e imagens
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#E6F0FD] text-[#1565D8] flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Main Workspace Card */}
      <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_1px_4px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1256BA] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-extrabold tracking-tight truncate">
              1.2.1 PADRÕES DE EQUIPAMENTOS
            </h2>
            <p className="text-[0.74rem] text-blue-100/90 truncate">
              Padrão de Equipamentos de Manuseio, diretrizes operacionais e documentos técnicos da frota
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#06295A] hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Anexar Documento</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar documento ou observação..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => quickFileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1565D8]/40 bg-blue-50/70 hover:bg-blue-100/70 text-[#0B3C7D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Enviar Word / PDF</span>
          </button>
        </div>

        {/* Workspace Content */}
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
                  Arraste e solte o arquivo aqui para salvar em 1.2.1 PADRÕES DE EQUIPAMENTOS
                </p>
                <p className="text-[0.72rem] text-slate-500 truncate">
                  Suporta Word (.docx/.doc), PDF, Excel e imagens até 15 MB — salvo diretamente no banco de dados.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#06295A] shrink-0 hidden sm:inline-block">
              Selecionar arquivo
            </span>
          </div>

          {/* Documents Table */}
          {filteredRecords.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#06295A]">
                Nenhum documento anexado em 1.2.1 Padrões de Equipamentos
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Arraste seu documento Word (.docx) ou PDF na área acima, ou clique em &ldquo;Anexar Documento&rdquo;.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200/80 bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 pl-4 pr-3">Arquivo</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Data Ref.</th>
                    <th className="py-2.5 px-3">Validade / Revisão</th>
                    <th className="py-2.5 px-3">Observação</th>
                    <th className="py-2.5 pl-3 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.map((rec) => {
                    const hasFile = Boolean(rec.fileDataUrl);
                    return (
                      <tr key={rec.id} className="hover:bg-blue-50/35 transition-colors">
                        <td className="py-2.5 pl-4 pr-3">
                          <div className="flex items-center gap-2.5 min-w-[220px]">
                            {renderFileTypeIcon(rec.fileType, rec.fileName)}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="font-semibold text-[#06295A] truncate max-w-[320px]"
                                  title={rec.fileName}
                                >
                                  {rec.fileName}
                                </span>
                                {!hasFile && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[0.64rem] font-bold text-amber-700 whitespace-nowrap">
                                    Aguardando arquivo
                                  </span>
                                )}
                              </div>
                              <div className="text-[0.68rem] text-slate-400 font-mono-tabular">
                                {formatBytes(rec.fileSize)} •{' '}
                                {hasFile
                                  ? `Enviado em ${rec.uploadedAt || rec.referenceDate}`
                                  : `Ref.: ${rec.referenceDate}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[#06295A] font-semibold text-[0.7rem]">
                            {getFileTypeLabel(rec.fileType, rec.fileName)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {rec.referenceDate || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {rec.expiryDate || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[240px] truncate" title={rec.notes}>
                          {rec.notes || '—'}
                        </td>
                        <td className="py-2.5 pl-3 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {hasFile ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewRecord(rec)}
                                  title="Visualizar detalhes / prévia"
                                  className="p-1.5 rounded-lg text-[#0B3C7D] hover:bg-blue-100/70 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(rec)}
                                  title="Baixar arquivo"
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white text-[0.72rem] font-semibold transition-colors cursor-pointer"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Anexar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(rec);
                                setEditRefDate(rec.referenceDate);
                                setEditExpiry(rec.expiryDate);
                                setEditNotes(rec.notes);
                              }}
                              title="Editar informações"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#06295A] hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteRecord(rec.id)}
                              title="Excluir documento"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Add Document Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] to-[#1256BA] text-white flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-extrabold tracking-tight">
                  Anexar Documento — 1.2.1 Padrões de Equipamentos
                </h3>
                <p className="text-[0.72rem] text-blue-100/90">
                  Envie arquivos Word (.docx/.doc), PDF, Excel ou imagens (até 15 MB)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddModal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Arquivo(s) *
                </label>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  multiple
                  accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    if (e.target.files) {
                      setDraftFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1565D8] bg-slate-50/70 hover:bg-blue-50/40 px-4 py-4 text-center transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-5 h-5 text-[#1565D8] mx-auto mb-1" />
                  <span className="font-semibold text-[#06295A] block">
                    {draftFiles.length > 0
                      ? `${draftFiles.length} arquivo(s) selecionado(s)`
                      : 'Clique para selecionar Word (.docx), PDF ou imagem'}
                  </span>
                  {draftFiles.length > 0 && (
                    <span className="text-[0.7rem] text-slate-500 mt-0.5 block truncate">
                      {draftFiles.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ')}
                    </span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data de Referência
                  </label>
                  <input
                    type="text"
                    value={draftRefDate}
                    onChange={(e) => setDraftRefDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Validade / Próxima Revisão
                  </label>
                  <input
                    type="text"
                    value={draftExpiry}
                    onChange={(e) => setDraftExpiry(e.target.value)}
                    placeholder="Opcional (DD/MM/AAAA)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observação
                </label>
                <textarea
                  rows={2}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Ex.: Padrão oficial de equipamentos de manuseio..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={draftFiles.length === 0 || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] disabled:opacity-50 text-white font-semibold cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] to-[#1256BA] text-white flex items-center justify-between">
              <h3 className="font-display text-sm font-extrabold tracking-tight truncate pr-3">
                Editar — {editingRecord.fileName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateRecord(editingRecord.id, {
                  referenceDate: editRefDate.trim(),
                  expiryDate: editExpiry.trim(),
                  notes: editNotes.trim(),
                });
                setEditingRecord(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data de Referência
                  </label>
                  <input
                    type="text"
                    value={editRefDate}
                    onChange={(e) => setEditRefDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Validade / Revisão
                  </label>
                  <input
                    type="text"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1565D8] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B3C7D] hover:bg-[#1256BA] text-white font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[88vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] to-[#1256BA] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-extrabold truncate">
                  {previewRecord.fileName}
                </h3>
                <p className="text-[0.72rem] text-blue-100/90">
                  {getFileTypeLabel(previewRecord.fileType, previewRecord.fileName)} •{' '}
                  {formatBytes(previewRecord.fileSize)} • Ref.: {previewRecord.referenceDate || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewRecord)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#06295A] hover:bg-blue-50 text-xs font-bold cursor-pointer"
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

            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[360px]">
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
