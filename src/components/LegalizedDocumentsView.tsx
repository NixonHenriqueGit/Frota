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
  Trash2,
  Truck,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  CrlvSubfolderName,
  LegalizedDocumentRecord,
  LegalizedFolderName,
  Vehicle,
} from '../types/fleet';
import { DocumentPreviewContent } from './DocumentPreviewContent';
import { MAX_LEGALIZED_FILE_BYTES, RECIBOS_ID_PREFIX } from '../services/fleetFirestore';
import { PLATFORM_CARD_GRID_CLASS, PlatformCard } from './PlatformCard';

export const CRLV_SUBFOLDERS: {
  id: CrlvSubfolderName;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'ENTREGA',
    title: 'ENTREGA',
    subtitle: 'CRLV dos caminhões de entrega e distribuição',
  },
  {
    id: 'FROTA LEVE',
    title: 'FROTA LEVE',
    subtitle: 'CRLV dos veículos leves, vendas e apoio',
  },
  {
    id: 'PUXADA',
    title: 'PUXADA',
    subtitle: 'CRLV de cavalos mecânicos, carretas e puxada',
  },
];

export const LEGALIZED_FOLDERS: {
  id: LegalizedFolderName;
  kicker: string;
  title: string;
  subtitle: string;
  defaultRefDate: string;
}[] = [
  {
    id: 'ANTT',
    kicker: '01 · Transporte',
    title: 'ANTT',
    subtitle: 'Agência Nacional de Transportes Terrestres',
    defaultRefDate: '21/08/2026',
  },
  {
    id: 'CONTRATO DE LOCAÇÃO VEICULAR',
    kicker: '02 · Contratos',
    title: 'CONTRATO DE LOCAÇÃO VEICULAR',
    subtitle: 'Contratos de locação, aditivos e termos veiculares',
    defaultRefDate: '31/03/2026',
  },
  {
    id: 'CRLV',
    kicker: '03 · Licenciamento',
    title: 'CRLV',
    subtitle: 'Certificado de Registro e Licenciamento de Veículo',
    defaultRefDate: '16/07/2026',
  },
  {
    id: 'CRONOTACÓGRAFOS',
    kicker: '04 · Aferição INMETRO',
    title: 'CRONOTACÓGRAFOS',
    subtitle: 'Equipamento que registra velocidade, tempo e distância (INMETRO)',
    defaultRefDate: '16/07/2026',
  },
  {
    id: 'RECIBOS',
    kicker: '05 · Comprovantes',
    title: 'RECIBOS',
    subtitle: 'Recibos e comprovantes de pagamento, taxas e serviços da frota',
    defaultRefDate: '27/11/2026',
  },
];

interface LegalizedDocumentsViewProps {
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

function detectPlateFromFilename(fileName: string, vehicles: Vehicle[]): string {
  const upper = fileName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const v of vehicles) {
    const cleanPlate = v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanPlate && upper.includes(cleanPlate)) {
      return v.plate;
    }
  }
  return 'GERAL';
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

function inferCrlvSubfolderForVehicle(v?: Vehicle): CrlvSubfolderName {
  if (!v) return 'ENTREGA';
  if (
    v.sector === 'Puxada' ||
    v.category === 'Carga Semi-Reboque' ||
    v.category === 'Tração Caminhão Trator'
  ) {
    return 'PUXADA';
  }
  if (v.category === 'Frota Leve') {
    return 'FROTA LEVE';
  }
  return 'ENTREGA';
}

export const LegalizedDocumentsView: React.FC<LegalizedDocumentsViewProps> = ({
  records,
  vehicles,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<LegalizedFolderName | 'ALL'>('ANTT');
  const [selectedCrlvSubfolder, setSelectedCrlvSubfolder] = useState<
    CrlvSubfolderName | 'ALL'
  >('ALL');
  const [activeTab, setActiveTab] = useState<'files' | 'fleet'>('files');
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
  const [draftFolder, setDraftFolder] = useState<LegalizedFolderName>('ANTT');
  const [draftSubfolder, setDraftSubfolder] = useState<CrlvSubfolderName>('ENTREGA');
  const [draftPlate, setDraftPlate] = useState('GERAL');
  const [draftExpiry, setDraftExpiry] = useState('');
  const [draftRefDate, setDraftRefDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [draftNotes, setDraftNotes] = useState('');
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<LegalizedDocumentRecord | null>(null);
  const [editFolder, setEditFolder] = useState<LegalizedFolderName>('ANTT');
  const [editSubfolder, setEditSubfolder] = useState<CrlvSubfolderName>('ENTREGA');
  const [editPlate, setEditPlate] = useState('GERAL');
  const [editExpiry, setEditExpiry] = useState('');
  const [editRefDate, setEditRefDate] = useState('');
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

  const folderCounts = useMemo(() => {
    const counts: Record<LegalizedFolderName, number> = {
      ANTT: 0,
      'CONTRATO DE LOCAÇÃO VEICULAR': 0,
      CRLV: 0,
      CRONOTACÓGRAFOS: 0,
      'LAUDO DE VIGILÂNCIA SANITÁRIA': 0,
      'PADRÕES DE EQUIPAMENTOS': 0,
      'PADRÕES VISUAIS': 0,
      'CHECK DE SEGURANÇA': 0,
      'BLITZ DE ENTREGA': 0,
      'BLITZ DE PUXADA': 0,
      'BLITZ EMPILHADEIRA': 0,
      'CAMINHÕES': 0,
      'PUXADA': 0,
      'MELHORIA PROGRESSIVA': 0,
      'ESTRATIFICAÇÃO PROBLEMAS': 0,
      DTO: 0,
      RECIBOS: 0,
    };
    for (const r of records) {
      if (counts[r.folder] !== undefined) {
        counts[r.folder] += 1;
      }
    }
    return counts;
  }, [records]);

  const crlvSubfolderCounts = useMemo(() => {
    const counts: Record<CrlvSubfolderName, number> = {
      ENTREGA: 0,
      'FROTA LEVE': 0,
      PUXADA: 0,
    };
    for (const r of records) {
      if (r.folder === 'CRLV' && r.subfolder && counts[r.subfolder] !== undefined) {
        counts[r.subfolder] += 1;
      }
    }
    return counts;
  }, [records]);

  const sortedVehicles = useMemo(
    () => [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedFolder !== 'ALL' && r.folder !== selectedFolder) return false;
      if (
        selectedFolder === 'CRLV' &&
        selectedCrlvSubfolder !== 'ALL' &&
        r.subfolder !== selectedCrlvSubfolder
      ) {
        return false;
      }
      return true;
    });
  }, [records, selectedFolder, selectedCrlvSubfolder]);

  const activeFolderMeta = useMemo(() => {
    if (selectedFolder === 'ALL') {
      return {
        id: 'ALL' as const,
        title: 'TODAS AS PASTAS (1.1.1 DOCUMENTOS LEGALIZADOS)',
        subtitle: 'Visão unificada de todos os arquivos anexados nas 5 pastas oficiais',
      };
    }
    if (selectedFolder === 'CRLV' && selectedCrlvSubfolder !== 'ALL') {
      const subMeta = CRLV_SUBFOLDERS.find((s) => s.id === selectedCrlvSubfolder);
      return {
        id: 'CRLV' as const,
        title: `CRLV / ${selectedCrlvSubfolder}`,
        subtitle: subMeta?.subtitle ?? 'Subpasta oficial de CRLV',
      };
    }
    return LEGALIZED_FOLDERS.find((f) => f.id === selectedFolder) ?? LEGALIZED_FOLDERS[0];
  }, [selectedFolder, selectedCrlvSubfolder]);

  const resolveSubfolderForUpload = (
    folder: LegalizedFolderName,
    plate: string,
    forcedSubfolder?: CrlvSubfolderName
  ): CrlvSubfolderName | '' => {
    if (folder !== 'CRLV') return '';
    if (forcedSubfolder) return forcedSubfolder;
    if (selectedCrlvSubfolder !== 'ALL') return selectedCrlvSubfolder;
    const clean = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const matchedVehicle = vehicles.find(
      (v) => v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === clean
    );
    return inferCrlvSubfolderForVehicle(matchedVehicle);
  };

  const handleQuickUploadFiles = async (
    fileList: FileList | File[],
    targetFolder?: LegalizedFolderName,
    forcedPlate?: string,
    forcedSubfolder?: CrlvSubfolderName
  ) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const folder: LegalizedFolderName =
      targetFolder ?? (selectedFolder === 'ALL' ? 'ANTT' : selectedFolder);
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
      const subfolder = resolveSubfolderForUpload(folder, detectedPlate, forcedSubfolder);
      const prefix = folder === 'RECIBOS' ? RECIBOS_ID_PREFIX : 'leg-';
      created.push({
        id: `${prefix}${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        folder,
        subfolder,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
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
    const nextFolder = selectedFolder === 'ALL' ? 'ANTT' : selectedFolder;
    setDraftFolder(nextFolder);
    setDraftSubfolder(
      selectedCrlvSubfolder === 'ALL' ? 'ENTREGA' : selectedCrlvSubfolder
    );
    setDraftPlate('GERAL');
    setDraftExpiry('');
    setDraftRefDate(new Date().toLocaleDateString('pt-BR'));
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
        const prefix = draftFolder === 'RECIBOS' ? RECIBOS_ID_PREFIX : 'leg-';
        created.push({
          id: `${prefix}${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          folder: draftFolder,
          subfolder: draftFolder === 'CRLV' ? draftSubfolder : '',
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
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
      setSelectedFolder(draftFolder);
      if (draftFolder === 'CRLV') {
        setSelectedCrlvSubfolder(draftSubfolder);
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

  const fleetMatrixRows = useMemo(() => {
    const folder = selectedFolder === 'ALL' ? 'ANTT' : selectedFolder;
    return sortedVehicles
      .filter((v) => {
        if (
          selectedFolder === 'CRLV' &&
          selectedCrlvSubfolder !== 'ALL' &&
          inferCrlvSubfolderForVehicle(v) !== selectedCrlvSubfolder
        ) {
          return false;
        }
        return true;
      })
      .map((v) => {
        const expectedSub = folder === 'CRLV' ? inferCrlvSubfolderForVehicle(v) : '';
        const attached = records.filter((r) => {
          if (r.folder !== folder) return false;
          if (
            folder === 'CRLV' &&
            selectedCrlvSubfolder !== 'ALL' &&
            r.subfolder !== selectedCrlvSubfolder
          ) {
            return false;
          }
          return (
            r.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() ===
            v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase()
          );
        });
        let docValue = 'Não informado';
        if (folder === 'ANTT') docValue = v.expiryDates.antt || 'Não informado';
        else if (folder === 'CRLV') docValue = v.expiryDates.crlv || 'Não informado';
        else if (folder === 'CRONOTACÓGRAFOS')
          docValue = v.expiryDates.cronotacografo || 'Não informado';
        else if (folder === 'CONTRATO DE LOCAÇÃO VEICULAR')
          docValue = v.ownership === 'Terceiro' ? 'Terceiro / Locado' : 'Frota Própria';
        else if (folder === 'RECIBOS')
          docValue = attached.length > 0 ? `${attached.length} recibo(s)` : 'Sem recibos';

        return {
          vehicle: v,
          docValue,
          expectedSub,
          attached,
        };
      });
  }, [sortedVehicles, selectedFolder, selectedCrlvSubfolder, records]);

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Hidden File Inputs */}
      <input
        ref={quickFileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
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
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && vehicleUploadTarget) {
            const folder: LegalizedFolderName =
              selectedFolder === 'ALL' ? 'ANTT' : selectedFolder;
            const forcedSub =
              folder === 'CRLV'
                ? selectedCrlvSubfolder !== 'ALL'
                  ? selectedCrlvSubfolder
                  : inferCrlvSubfolderForVehicle(vehicleUploadTarget)
                : undefined;
            void handleQuickUploadFiles(
              e.target.files,
              folder,
              vehicleUploadTarget.plate,
              forcedSub
            );
          }
          e.target.value = '';
          setVehicleUploadTarget(null);
        }}
      />

      <input
        ref={rowAttachInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
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
              notes: rowAttachTarget.notes.includes('Aguardando') || rowAttachTarget.notes.includes('clique em Anexar')
                ? ''
                : rowAttachTarget.notes,
            });
          }
          e.target.value = '';
          setRowAttachTarget(null);
        }}
      />

      {/* 5 Official Document Category Cards */}
      <section aria-label="Categorias de Documentos Legalizados">
        <div className={PLATFORM_CARD_GRID_CLASS}>
          {LEGALIZED_FOLDERS.map((folder) => {
            const isSelected = selectedFolder === folder.id;
            const fileCount = folderCounts[folder.id];
            return (
              <PlatformCard
                key={folder.id}
                kicker={folder.kicker}
                countLabel={`${String(fileCount).padStart(2, '0')} arq.`}
                title={folder.title}
                subtitle={folder.subtitle}
                statusLabel={isSelected ? 'Pasta aberta' : 'Pasta oficial'}
                actionLabel={isSelected ? 'Aberta' : 'Abrir'}
                selected={isSelected}
                onClick={() => setSelectedFolder(folder.id)}
              />
            );
          })}
        </div>
      </section>

      {/* Active Folder Workspace Card */}
      <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[0.9rem] font-bold tracking-[0.015em] [word-spacing:0.12em] truncate">
              {activeFolderMeta.title}
            </h3>
            <p className="text-[0.71rem] text-blue-100/85 truncate">
              {activeFolderMeta.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Inner Tab Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#051D43]/70 border border-white/15">
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'files'
                    ? 'bg-white text-[#06295A] shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Arquivos na Pasta ({filteredRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'fleet'
                    ? 'bg-white text-[#06295A] shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Controle por Veículo ({vehicles.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => quickFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Envio Rápido</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#06295A] hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Anexar Documento</span>
            </button>
          </div>
        </div>

        {/* CRLV Subfolders Strip (ENTREGA, FROTA LEVE, PUXADA) */}
        {selectedFolder === 'CRLV' && (
          <div className="px-4 py-2.5 bg-[#F6F9FE] border-b border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-500">
                Subdivisões de CRLV
              </span>
              {selectedCrlvSubfolder !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCrlvSubfolder('ALL')}
                  className="text-xs font-semibold text-[#1565D8] hover:underline cursor-pointer"
                >
                  Mostrar todas as subdivisões ({folderCounts.CRLV})
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CRLV_SUBFOLDERS.map((sub) => {
                const isSubActive = selectedCrlvSubfolder === sub.id;
                const subCount = crlvSubfolderCounts[sub.id];
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      setSelectedCrlvSubfolder((prev) =>
                        prev === sub.id ? 'ALL' : sub.id
                      )
                    }
                    className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 cursor-pointer ${
                      isSubActive
                        ? 'bg-[#0B3C7D] border-[#0B3C7D] text-white shadow-sm'
                        : 'bg-white border-slate-200/90 text-[#06295A] hover:border-[#60A5FA] hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div
                        className={`font-display text-xs font-bold tracking-[0.015em] [word-spacing:0.12em] truncate ${
                          isSubActive ? 'text-white' : 'text-[#06295A]'
                        }`}
                      >
                        {sub.title}
                      </div>
                      <div
                        className={`text-[0.67rem] truncate ${
                          isSubActive ? 'text-blue-100/85' : 'text-slate-500'
                        }`}
                      >
                        {sub.subtitle}
                      </div>
                    </div>
                    <span
                      className={`font-mono-tabular text-sm font-extrabold leading-none shrink-0 ${
                        isSubActive ? 'text-white' : 'text-[#06295A]'
                      }`}
                    >
                      {String(subCount).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

            {/* Compact Drag & Drop Strip */}
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
                    Arraste e solte arquivos aqui para salvar em{' '}
                    <span className="text-[#1565D8]">
                      {selectedFolder === 'ALL'
                        ? 'ANTT'
                        : selectedFolder === 'CRLV' && selectedCrlvSubfolder !== 'ALL'
                          ? `CRLV / ${selectedCrlvSubfolder}`
                          : selectedFolder}
                    </span>
                  </p>
                  <p className="text-[0.71rem] text-slate-500 truncate">
                    Suporta PDF, imagens (JPG/PNG), planilhas e documentos. Placas no nome do arquivo são vinculadas automaticamente.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[0.72rem] font-semibold text-[#06295A] shrink-0">
                Selecionar arquivos
              </span>
            </div>

            {/* Files Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Arquivo</th>
                    <th className="py-2.5 px-3">Pasta</th>
                    <th className="py-2.5 px-3">Placa / Vínculo</th>
                    <th className="py-2.5 px-3">Data Ref.</th>
                    <th className="py-2.5 px-3">Validade</th>
                    <th className="py-2.5 px-3">Observação</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="max-w-sm mx-auto space-y-2">
                          <FileText className="w-9 h-9 text-slate-300 mx-auto" />
                          <p className="text-sm font-bold text-[#06295A]">
                            Nenhum arquivo nesta categoria ainda
                          </p>
                          <p className="text-xs text-slate-500">
                            Clique em <strong>Anexar Documento</strong> ou arraste PDFs e imagens para organizar os arquivos de{' '}
                            <strong>{selectedFolder === 'ALL' ? 'Documentos Legalizados' : selectedFolder}</strong>.
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
                                <span className="font-semibold text-[#06295A] truncate max-w-[230px]">
                                  {rec.fileName}
                                </span>
                                {!rec.fileDataUrl && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[0.64rem] font-bold shrink-0">
                                    Aguardando arquivo
                                  </span>
                                )}
                              </div>
                              <div className="text-[0.68rem] text-slate-400 font-mono-tabular">
                                {formatBytes(rec.fileSize)} • {rec.fileDataUrl ? `Enviado em ${rec.uploadedAt}` : `Ref.: ${rec.referenceDate || rec.uploadedAt}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[0.73rem] font-semibold text-[#06295A]">
                          {rec.folder === 'CRLV' && rec.subfolder
                            ? `CRLV / ${rec.subfolder}`
                            : rec.folder}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[#06295A] font-mono-tabular font-bold text-[0.72rem]">
                            {rec.plate || 'GERAL'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
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
                        <td className="py-2 px-3 text-slate-600 max-w-[230px]">
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
                                    <span>Anexar</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(rec);
                                    setEditFolder(rec.folder);
                                    setEditSubfolder(
                                      (rec.subfolder as CrlvSubfolderName) || 'ENTREGA'
                                    );
                                    setEditPlate(rec.plate || 'GERAL');
                                    setEditExpiry(rec.expiryDate);
                                    setEditRefDate(rec.referenceDate);
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
                                  title="Excluir arquivo"
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
          /* Fleet Control Tab for the Selected Folder */
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Placa</th>
                  <th className="py-2.5 px-3">Veículo</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3">
                    {selectedFolder === 'CONTRATO DE LOCAÇÃO VEICULAR'
                      ? 'Vínculo / Proprietário'
                      : `Registro / Validade (${selectedFolder === 'ALL' ? 'ANTT' : selectedFolder})`}
                  </th>
                  <th className="py-2.5 px-3">Arquivos na Pasta</th>
                  <th className="py-2.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleetMatrixRows.map(({ vehicle: v, docValue, attached }) => (
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
                      {docValue}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {attached.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('files');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.71rem] font-semibold hover:bg-emerald-100 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {attached.length}{' '}
                            {attached.length === 1 ? 'anexo' : 'anexos'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[0.72rem]">
                          Sem arquivo anexado
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

      {/* Attach Document Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#06295A] text-white">
              <h3 className="font-display text-sm font-bold">
                Anexar em 1.1.1 Documentos Legalizados
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pasta de Destino
                  </label>
                  <select
                    value={draftFolder}
                    onChange={(e) => setDraftFolder(e.target.value as LegalizedFolderName)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium bg-white focus:border-[#1565D8] focus:outline-none"
                  >
                    {LEGALIZED_FOLDERS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa / Vínculo
                  </label>
                  <select
                    value={draftPlate}
                    onChange={(e) => {
                      const nextPlate = e.target.value;
                      setDraftPlate(nextPlate);
                      if (draftFolder === 'CRLV' && nextPlate !== 'GERAL') {
                        const veh = vehicles.find((v) => v.plate === nextPlate);
                        if (veh) setDraftSubfolder(inferCrlvSubfolderForVehicle(veh));
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium bg-white focus:border-[#1565D8] focus:outline-none"
                  >
                    <option value="GERAL">GERAL (Documento da Frota/Empresa)</option>
                    {sortedVehicles.map((v) => (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — {v.manufacturerModel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {draftFolder === 'CRLV' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subpasta de CRLV
                  </label>
                  <select
                    value={draftSubfolder}
                    onChange={(e) => setDraftSubfolder(e.target.value as CrlvSubfolderName)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium bg-white focus:border-[#1565D8] focus:outline-none"
                  >
                    {CRLV_SUBFOLDERS.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-tabular focus:border-[#1565D8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Validade (opcional)
                  </label>
                  <input
                    type="text"
                    value={draftExpiry}
                    onChange={(e) => setDraftExpiry(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-tabular focus:border-[#1565D8] focus:outline-none"
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
                  placeholder="Ex.: Contrato renovado, certificado INMETRO, etc."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#1565D8] focus:outline-none"
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
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
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
                      Clique para selecionar PDF, imagem ou documento
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
                  {isSubmitting ? 'Salvando...' : 'Salvar na Pasta'}
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
              <h3 className="font-display text-sm font-bold truncate">
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
                const movingRecibosBoundary =
                  editingRecord.folder !== editFolder &&
                  (editingRecord.folder === 'RECIBOS' || editFolder === 'RECIBOS');

                if (movingRecibosBoundary) {
                  const nextPrefix = editFolder === 'RECIBOS' ? RECIBOS_ID_PREFIX : 'leg-';
                  const migratedRecord: LegalizedDocumentRecord = {
                    ...editingRecord,
                    id: `${nextPrefix}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    folder: editFolder,
                    subfolder: editFolder === 'CRLV' ? editSubfolder : '',
                    plate: editPlate || 'GERAL',
                    expiryDate: editExpiry.trim(),
                    referenceDate: editRefDate.trim(),
                    notes: editNotes.trim(),
                  };
                  onAddRecords([migratedRecord]);
                  onDeleteRecord(editingRecord.id);
                } else {
                  onUpdateRecord(editingRecord.id, {
                    folder: editFolder,
                    subfolder: editFolder === 'CRLV' ? editSubfolder : '',
                    plate: editPlate || 'GERAL',
                    expiryDate: editExpiry.trim(),
                    referenceDate: editRefDate.trim(),
                    notes: editNotes.trim(),
                  });
                }
                setEditingRecord(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pasta
                </label>
                <select
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value as LegalizedFolderName)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                >
                  {LEGALIZED_FOLDERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>

              {editFolder === 'CRLV' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subpasta de CRLV
                  </label>
                  <select
                    value={editSubfolder}
                    onChange={(e) => setEditSubfolder(e.target.value as CrlvSubfolderName)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                  >
                    {CRLV_SUBFOLDERS.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placa / Vínculo
                </label>
                <select
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                >
                  <option value="GERAL">GERAL (Frota / Empresa)</option>
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-tabular"
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-tabular"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
                <h3 className="font-display text-sm font-bold truncate">
                  {previewRecord.fileName}
                </h3>
                <p className="text-[0.7rem] text-blue-100">
                  {previewRecord.folder} • {previewRecord.plate || 'GERAL'}
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
