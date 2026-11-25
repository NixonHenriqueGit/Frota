import {
  Timestamp,
  WriteBatch,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  OperationType,
  SHARED_WORKSPACE_ID,
  db,
  handleFirestoreError,
} from '../firebase';
import {
  CHECKLIST_ITEMS,
  INITIAL_DOCUMENTS,
  INITIAL_EVIDENCES,
  INITIAL_VEHICLES,
  resolveVehiclePhoto,
} from '../data/fleetSeed';
import {
  ChecklistKey,
  Company,
  ComplianceCheckRecord,
  ComplianceDocStatus,
  ComplianceMonth,
  ComplianceOperation,
  CrlvSubfolderName,
  DocumentStatus,
  DocumentType,
  LegalizedDocumentRecord,
  LegalizedFolderName,
  OwnershipType,
  Sector,
  Vehicle,
  VehicleCategory,
  VehicleDocumentRecord,
  VehicleEvidenceRecord,
  VehicleStatus,
} from '../types/fleet';
import {
  buildDocumentsForVehicle,
  buildEvidenceForVehicle,
  normalizeCategory,
  sanitizeFirestoreId,
} from '../utils/fleetSpreadsheet';

function toFirestoreCategory(cat: VehicleCategory): string {
  switch (cat) {
    case 'Carga Semi-Reboque':
      return 'Carreta';
    case 'Tração Caminhão Trator':
      return 'Cavalo Mecânico';
    default:
      return cat;
  }
}

function fromFirestoreCategory(raw: unknown): VehicleCategory {
  return normalizeCategory(raw);
}

const VALID_SECTORS = new Set<Sector>([
  'Distribuição',
  'Vendas',
  'Puxada',
  'Armazém',
  'Marketing',
]);

const VALID_COMPANIES = new Set<Company>([
  'Pau Brasil Matriz',
  'Pau Brasil Brejo',
  'Terceirizados',
]);

const VALID_STATUS = new Set<VehicleStatus>(['Ativo', 'Parado']);
const VALID_OWNERSHIP = new Set<OwnershipType>(['Próprio', 'Terceiro']);
const VALID_DOC_TYPES = new Set<DocumentType>([
  'CRLV',
  'IPVA',
  'Cronotacógrafo',
  'ANTT',
  'Alvará Vigilância Sanitária',
  'Extintor',
]);
const VALID_DOC_STATUS = new Set<DocumentStatus>(['Regular', 'A vencer', 'Vencido']);
const VALID_LEGALIZED_FOLDERS = new Set<LegalizedFolderName>([
  'ANTT',
  'CONTRATO DE LOCAÇÃO VEICULAR',
  'CRLV',
  'CRONOTACÓGRAFOS',
  'LAUDO DE VIGILÂNCIA SANITÁRIA',
]);
const VALID_CRLV_SUBFOLDERS = new Set<CrlvSubfolderName>([
  'ENTREGA',
  'FROTA LEVE',
  'PUXADA',
]);

const VALID_COMPLIANCE_MONTHS = new Set<ComplianceMonth>([
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]);

const VALID_COMPLIANCE_OPERATIONS = new Set<ComplianceOperation>([
  'ENTREGA',
  'PUXADA',
  'FROTA LEVE',
]);

const VALID_COMPLIANCE_STATUS = new Set<ComplianceDocStatus>(['OK', 'NOK', 'N/A']);

const FIRESTORE_LEGALIZED_DATAURL_MAX_BYTES = 850000;
export const MAX_LEGALIZED_INLINE_BYTES = 800000;
export const LEGALIZED_CHUNK_SIZE = 700000;
export const MAX_LEGALIZED_FILE_BYTES = 15 * 1024 * 1024;
const MAX_LEGALIZED_FILE_DATAURL_BYTES = 21_000_000;
const LEGALIZED_CHUNK_MIME = 'application/x-pb-chunk';
const CHUNKED_MARKER_PREFIX = '__CHUNKED__:';

const utf8Encoder = new TextEncoder();

function clampStr(val: unknown, maxBytes: number, fallback = ''): string {
  const raw = typeof val === 'string' ? val : val == null ? fallback : String(val);
  if (raw.length === 0 || maxBytes <= 0) return '';
  if (utf8Encoder.encode(raw).length <= maxBytes) return raw;
  let end = raw.length;
  while (end > 0 && utf8Encoder.encode(raw.slice(0, end)).length > maxBytes) {
    end -= Math.max(1, Math.floor((end * 0.1)));
    if (end > 0 && utf8Encoder.encode(raw.slice(0, end)).length <= maxBytes) {
      while (end < raw.length && utf8Encoder.encode(raw.slice(0, end + 1)).length <= maxBytes) {
        end += 1;
      }
      break;
    }
  }
  return raw.slice(0, Math.max(0, end));
}

function clampNonNegNum(val: unknown, fallback = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeChecklist(chk: Partial<Record<ChecklistKey, boolean>> | undefined): Record<ChecklistKey, boolean> {
  const out = {} as Record<ChecklistKey, boolean>;
  for (const item of CHECKLIST_ITEMS) {
    out[item.key] = Boolean(chk?.[item.key]);
  }
  return out;
}

function normalizeExpiryDates(exp: Partial<Vehicle['expiryDates']> | undefined): Vehicle['expiryDates'] {
  return {
    crlv: clampStr(exp?.crlv, 40),
    ipva: clampStr(exp?.ipva, 40),
    antt: clampStr(exp?.antt, 40),
    cnt: clampStr(exp?.cnt, 40),
    alvaraSanitario: clampStr(exp?.alvaraSanitario, 40),
    extintor: clampStr(exp?.extintor, 40),
    cronotacografo: clampStr(exp?.cronotacografo, 40),
  };
}

export function sanitizeVehicleForFirestore(
  v: Vehicle,
  ownerId: string,
  createdAt?: unknown
): Record<string, unknown> {
  const safeId = sanitizeFirestoreId(v.id);
  const normalizedCategory = normalizeCategory(v.category);
  const category = toFirestoreCategory(normalizedCategory);
  const sector = VALID_SECTORS.has(v.sector) ? v.sector : 'Distribuição';
  const company = VALID_COMPANIES.has(v.company) ? v.company : 'Pau Brasil Brejo';
  const status = VALID_STATUS.has(v.status) ? v.status : 'Ativo';
  const ownership = VALID_OWNERSHIP.has(v.ownership) ? v.ownership : 'Próprio';
  const plate = clampStr(String(v.plate ?? '').trim().toUpperCase(), 20, 'SEM-PLACA') || 'SEM-PLACA';
  const manufacturerModel =
    clampStr(String(v.manufacturerModel ?? '').trim(), 160) ||
    clampStr(String(v.model ?? '').trim(), 160) ||
    'Não informado';

  // Custom data URLs are stored in vehiclePhotos/{vehicleId}; vehicles keeps short resolved path
  const resolvedShortPhoto = resolveVehiclePhoto(plate, normalizedCategory);
  const rawPhotoUrl = typeof v.photoUrl === 'string' ? v.photoUrl : '';
  const photoUrl = rawPhotoUrl.startsWith('data:')
    ? resolvedShortPhoto
    : clampStr(rawPhotoUrl || resolvedShortPhoto, 512);

  return {
    id: safeId,
    ownerId,
    plate,
    fleetNumber: clampStr(v.fleetNumber, 40),
    typeCode: clampStr(v.typeCode, 40),
    category,
    sector,
    company,
    status,
    manufacturer: clampStr(v.manufacturer, 80),
    model: clampStr(v.model, 120),
    manufacturerModel,
    axles: clampStr(v.axles, 30),
    yearFab: Number.isFinite(v.yearFab) ? Math.round(v.yearFab) : 2025,
    yearMod: Number.isFinite(v.yearMod) ? Math.round(v.yearMod) : 2025,
    color: clampStr(v.color, 40),
    logoBrand: clampStr(v.logoBrand, 40),
    operationYear: clampStr(v.operationYear, 30),
    kmOrHours: Math.round(clampNonNegNum(v.kmOrHours, 0)),
    unit: v.unit === 'h' ? 'h' : 'km',
    bodywork: clampStr(v.bodywork, 60),
    tare: clampStr(v.tare, 40),
    pbt: clampStr(v.pbt, 40),
    ownership,
    hbFrota: Boolean(v.hbFrota),
    renavam: clampStr(v.renavam, 40),
    chassi: clampStr(v.chassi, 40),
    extinguisherSerial: clampStr(v.extinguisherSerial, 50),
    tankCapacity: clampStr(v.tankCapacity, 40),
    capacityPallets: clampStr(v.capacityPallets, 30),
    cargoCapacity: clampStr(v.cargoCapacity, 40),
    fuelType: clampStr(v.fuelType, 40),
    status2: clampStr(v.status2, 60),
    fipeValue: clampNonNegNum(v.fipeValue, 0),
    currentValue: clampNonNegNum(v.currentValue, 0),
    fipeCode: clampStr(v.fipeCode, 40),
    fleetAgeYears: clampStr(v.fleetAgeYears, 30),
    replacementTermYears: clampStr(v.replacementTermYears, 30),
    replacementTermKmHours: clampStr(v.replacementTermKmHours, 40),
    expectedReplacementMonthYear: clampStr(v.expectedReplacementMonthYear, 30),
    purchaseYear: clampStr(v.purchaseYear, 30),
    fleetAgeYearMonths: clampStr(v.fleetAgeYearMonths, 40),
    finalStatus: clampStr(v.finalStatus, 80),
    expiryDates: normalizeExpiryDates(v.expiryDates),
    checklist: normalizeChecklist(v.checklist),
    photoUrl,
    periodBucket:
      v.periodBucket === '30d' || v.periodBucket === '6m' || v.periodBucket === '12m'
        ? v.periodBucket
        : '30d',
    lastUpdated: clampStr(v.lastUpdated, 40),
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function sanitizeDocumentForFirestore(
  d: VehicleDocumentRecord,
  ownerId: string,
  createdAt?: unknown
): Record<string, unknown> {
  return {
    id: sanitizeFirestoreId(d.id),
    ownerId,
    vehicleId: sanitizeFirestoreId(d.vehicleId),
    plate: clampStr(String(d.plate ?? '').trim().toUpperCase(), 20, 'SEM-PLACA') || 'SEM-PLACA',
    model: clampStr(String(d.model ?? '').trim(), 160, 'Não informado') || 'Não informado',
    sector: VALID_SECTORS.has(d.sector) ? d.sector : 'Distribuição',
    type: VALID_DOC_TYPES.has(d.type) ? d.type : 'CRLV',
    status: VALID_DOC_STATUS.has(d.status) ? d.status : 'Regular',
    expiryDate: clampStr(d.expiryDate, 40),
    protocol: clampStr(d.protocol, 80),
    responsible: clampStr(d.responsible, 100),
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function sanitizeEvidenceForFirestore(
  e: VehicleEvidenceRecord,
  ownerId: string,
  createdAt?: unknown
): Record<string, unknown> {
  return {
    vehicleId: sanitizeFirestoreId(e.vehicleId),
    ownerId,
    plate: clampStr(String(e.plate ?? '').trim().toUpperCase(), 20, 'SEM-PLACA') || 'SEM-PLACA',
    model: clampStr(String(e.model ?? '').trim(), 160, 'Não informado') || 'Não informado',
    sector: VALID_SECTORS.has(e.sector) ? e.sector : 'Distribuição',
    crlv: Boolean(e.crlv),
    cnt: Boolean(e.cnt),
    antt: Boolean(e.antt),
    crlvFile: clampStr(e.crlvFile ?? '', 200),
    cntFile: clampStr(e.cntFile ?? '', 200),
    anttFile: clampStr(e.anttFile ?? '', 200),
    updatedDate: clampStr(e.updatedAt, 40),
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export interface VehicleFirestoreDoc extends Vehicle {
  ownerId: string;
  createdAt?: Timestamp;
}

export interface DocumentFirestoreDoc extends VehicleDocumentRecord {
  ownerId: string;
  createdAt?: Timestamp;
}

export interface EvidenceFirestoreDoc extends VehicleEvidenceRecord {
  ownerId: string;
  createdAt?: Timestamp;
}

export interface LegalizedDocFirestoreDoc extends LegalizedDocumentRecord {
  ownerId: string;
  createdAt?: Timestamp;
  rawFileDataUrl?: string;
}

export interface ComplianceCheckFirestoreDoc extends ComplianceCheckRecord {
  ownerId: string;
  createdAt?: Timestamp;
}

export function sanitizeLegalizedDocForFirestore(
  item: LegalizedDocumentRecord,
  ownerId: string,
  createdAt?: unknown
): Record<string, unknown> {
  const safeId = sanitizeFirestoreId(item.id);
  const folder = VALID_LEGALIZED_FOLDERS.has(item.folder) ? item.folder : 'ANTT';
  const subfolder =
    folder === 'CRLV' && item.subfolder && VALID_CRLV_SUBFOLDERS.has(item.subfolder as CrlvSubfolderName)
      ? item.subfolder
      : '';
  const rawDataUrl = typeof item.fileDataUrl === 'string' ? item.fileDataUrl : '';
  const inlineDataUrl =
    utf8Encoder.encode(rawDataUrl).length <= FIRESTORE_LEGALIZED_DATAURL_MAX_BYTES
      ? rawDataUrl
      : '';

  return {
    id: safeId,
    ownerId,
    folder,
    subfolder,
    fileName: clampStr(item.fileName, 200, 'documento.pdf') || 'documento.pdf',
    fileType: clampStr(item.fileType, 120, 'application/octet-stream'),
    fileSize: Math.round(clampNonNegNum(item.fileSize, 0)),
    plate: clampStr(String(item.plate ?? '').trim().toUpperCase(), 20),
    expiryDate: clampStr(item.expiryDate, 40),
    referenceDate: clampStr(item.referenceDate, 40),
    notes: clampStr(item.notes, 500),
    uploadedAt: clampStr(item.uploadedAt, 40),
    fileDataUrl: inlineDataUrl,
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function sanitizeComplianceCheckForFirestore(
  item: ComplianceCheckRecord,
  ownerId: string,
  createdAt?: unknown
): Record<string, unknown> {
  const safeId = sanitizeFirestoreId(item.id);
  const month = VALID_COMPLIANCE_MONTHS.has(item.month) ? item.month : 'JANEIRO';
  const operation = VALID_COMPLIANCE_OPERATIONS.has(item.operation) ? item.operation : 'ENTREGA';
  const normStatus = (val: unknown): ComplianceDocStatus =>
    VALID_COMPLIANCE_STATUS.has(val as ComplianceDocStatus)
      ? (val as ComplianceDocStatus)
      : 'OK';

  return {
    id: safeId,
    ownerId,
    month,
    operation,
    checkDate: clampStr(item.checkDate, 40),
    unit: clampStr(String(item.unit ?? '').trim(), 80, 'Guarabira') || 'Guarabira',
    plate: clampStr(String(item.plate ?? '').trim().toUpperCase(), 20, 'SEM-PLACA') || 'SEM-PLACA',
    crlvAno: normStatus(item.crlvAno),
    cronotacografo: normStatus(item.cronotacografo),
    antt: normStatus(item.antt),
    contratoLocacao: normStatus(item.contratoLocacao),
    notes: clampStr(item.notes, 500),
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function mapDocToVehicle(
  data: Record<string, unknown>,
  customPhotoUrl?: string
): VehicleFirestoreDoc {
  const plate = clampStr(data.plate, 20);
  const category = fromFirestoreCategory(data.category);
  const storedPhoto = clampStr(data.photoUrl, 512);
  const resolved = resolveVehiclePhoto(plate, category, customPhotoUrl || storedPhoto);
  return {
    id: String(data.id ?? ''),
    ownerId: String(data.ownerId ?? ''),
    plate,
    fleetNumber: clampStr(data.fleetNumber, 40),
    typeCode: clampStr(data.typeCode, 40),
    category,
    sector: VALID_SECTORS.has(data.sector as Sector) ? (data.sector as Sector) : 'Distribuição',
    company: VALID_COMPANIES.has(data.company as Company)
      ? (data.company as Company)
      : 'Pau Brasil Brejo',
    status: VALID_STATUS.has(data.status as VehicleStatus)
      ? (data.status as VehicleStatus)
      : 'Ativo',
    manufacturer: clampStr(data.manufacturer, 80),
    model: clampStr(data.model, 120),
    manufacturerModel: clampStr(data.manufacturerModel, 160),
    axles: clampStr(data.axles, 30),
    yearFab: Number(data.yearFab) || 2025,
    yearMod: Number(data.yearMod) || 2025,
    color: clampStr(data.color, 40),
    logoBrand: clampStr(data.logoBrand, 40),
    operationYear: clampStr(data.operationYear, 30),
    kmOrHours: Number(data.kmOrHours) || 0,
    unit: data.unit === 'h' ? 'h' : 'km',
    bodywork: clampStr(data.bodywork, 60),
    tare: clampStr(data.tare, 40),
    pbt: clampStr(data.pbt, 40),
    ownership: VALID_OWNERSHIP.has(data.ownership as OwnershipType)
      ? (data.ownership as OwnershipType)
      : 'Próprio',
    hbFrota: Boolean(data.hbFrota),
    renavam: clampStr(data.renavam, 40),
    chassi: clampStr(data.chassi, 40),
    extinguisherSerial: clampStr(data.extinguisherSerial, 50),
    tankCapacity: clampStr(data.tankCapacity, 40),
    capacityPallets: clampStr(data.capacityPallets, 30),
    cargoCapacity: clampStr(data.cargoCapacity, 40),
    fuelType: clampStr(data.fuelType, 40),
    status2: clampStr(data.status2, 60),
    fipeValue: Number(data.fipeValue) || 0,
    currentValue: Number(data.currentValue) || 0,
    fipeCode: clampStr(data.fipeCode, 40),
    fleetAgeYears: clampStr(data.fleetAgeYears, 30),
    replacementTermYears: clampStr(data.replacementTermYears, 30),
    replacementTermKmHours: clampStr(data.replacementTermKmHours, 40),
    expectedReplacementMonthYear: clampStr(data.expectedReplacementMonthYear, 30),
    purchaseYear: clampStr(data.purchaseYear, 30),
    fleetAgeYearMonths: clampStr(data.fleetAgeYearMonths, 40),
    finalStatus: clampStr(data.finalStatus, 80),
    expiryDates: normalizeExpiryDates(data.expiryDates as Partial<Vehicle['expiryDates']>),
    checklist: normalizeChecklist(data.checklist as Partial<Record<ChecklistKey, boolean>>),
    photoUrl: resolved,
    periodBucket:
      data.periodBucket === '30d' || data.periodBucket === '6m' || data.periodBucket === '12m'
        ? data.periodBucket
        : '30d',
    lastUpdated: clampStr(data.lastUpdated, 40),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  };
}

export function mapDocToVehicleDocument(data: Record<string, unknown>): DocumentFirestoreDoc {
  return {
    id: String(data.id ?? ''),
    ownerId: String(data.ownerId ?? ''),
    vehicleId: String(data.vehicleId ?? ''),
    plate: clampStr(data.plate, 20),
    model: clampStr(data.model, 160),
    sector: VALID_SECTORS.has(data.sector as Sector) ? (data.sector as Sector) : 'Distribuição',
    type: VALID_DOC_TYPES.has(data.type as DocumentType) ? (data.type as DocumentType) : 'CRLV',
    status: VALID_DOC_STATUS.has(data.status as DocumentStatus)
      ? (data.status as DocumentStatus)
      : 'Regular',
    expiryDate: clampStr(data.expiryDate, 40),
    protocol: clampStr(data.protocol, 80),
    responsible: clampStr(data.responsible, 100),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  };
}

export function mapDocToVehicleEvidence(data: Record<string, unknown>): EvidenceFirestoreDoc {
  const crlvFile = clampStr(data.crlvFile, 200);
  const cntFile = clampStr(data.cntFile, 200);
  const anttFile = clampStr(data.anttFile, 200);
  return {
    vehicleId: String(data.vehicleId ?? ''),
    ownerId: String(data.ownerId ?? ''),
    plate: clampStr(data.plate, 20),
    model: clampStr(data.model, 160),
    sector: VALID_SECTORS.has(data.sector as Sector) ? (data.sector as Sector) : 'Distribuição',
    crlv: Boolean(data.crlv),
    cnt: Boolean(data.cnt),
    antt: Boolean(data.antt),
    crlvFile: crlvFile || undefined,
    cntFile: cntFile || undefined,
    anttFile: anttFile || undefined,
    updatedAt: clampStr(data.updatedDate, 40),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  };
}

function generateChunkNonce(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function buildChunkDocId(safeParentId: string, nonce: string, idx: number): string {
  return `${safeParentId.slice(0, 90)}__c_${nonce}_${idx}`;
}

function parseChunkedMarker(val?: string): { nonce: string; totalChunks: number } | null {
  if (!val || !val.startsWith(CHUNKED_MARKER_PREFIX)) return null;
  const match = /^__CHUNKED__:([a-z0-9]+):(\d+)$/.exec(val);
  if (!match) return null;
  const totalChunks = Number(match[2]);
  if (!Number.isInteger(totalChunks) || totalChunks <= 0) return null;
  return { nonce: match[1], totalChunks };
}

export function isLegalizedChunkDoc(data: Record<string, unknown>): boolean {
  return data.fileType === LEGALIZED_CHUNK_MIME;
}

export function mapDocToLegalizedDoc(data: Record<string, unknown>): LegalizedDocFirestoreDoc {
  const folder = VALID_LEGALIZED_FOLDERS.has(data.folder as LegalizedFolderName)
    ? (data.folder as LegalizedFolderName)
    : 'ANTT';
  const rawSub = data.subfolder as CrlvSubfolderName | undefined;
  const subfolder =
    folder === 'CRLV' && rawSub && VALID_CRLV_SUBFOLDERS.has(rawSub) ? rawSub : '';
  const fileDataUrl = clampStr(data.fileDataUrl, FIRESTORE_LEGALIZED_DATAURL_MAX_BYTES);
  return {
    id: String(data.id ?? ''),
    ownerId: String(data.ownerId ?? ''),
    folder,
    subfolder,
    fileName: clampStr(data.fileName, 200, 'documento.pdf'),
    fileType: clampStr(data.fileType, 120),
    fileSize: Number(data.fileSize) || 0,
    plate: clampStr(data.plate, 20),
    expiryDate: clampStr(data.expiryDate, 40),
    referenceDate: clampStr(data.referenceDate, 40),
    notes: clampStr(data.notes, 500),
    uploadedAt: clampStr(data.uploadedAt, 40),
    fileDataUrl: fileDataUrl || undefined,
    rawFileDataUrl: fileDataUrl,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  };
}

export function reassembleLegalizedDocs(
  rawDocs: Record<string, unknown>[]
): LegalizedDocFirestoreDoc[] {
  const chunkMap = new Map<string, Map<number, string>>();
  const parentRawDocs: Record<string, unknown>[] = [];

  for (const data of rawDocs) {
    if (isLegalizedChunkDoc(data)) {
      const fileName = typeof data.fileName === 'string' ? data.fileName : '';
      const match = /^__CHUNK__:([-a-zA-Z0-9_]+):([a-z0-9]+):(\d+):(\d+)$/.exec(fileName);
      if (match) {
        const key = `${match[1]}:${match[2]}`;
        const idx = Number(match[3]);
        const slice = typeof data.fileDataUrl === 'string' ? data.fileDataUrl : '';
        let parts = chunkMap.get(key);
        if (!parts) {
          parts = new Map<number, string>();
          chunkMap.set(key, parts);
        }
        parts.set(idx, slice);
      }
    } else {
      parentRawDocs.push(data);
    }
  }

  return parentRawDocs.map((data) => {
    const mapped = mapDocToLegalizedDoc(data);
    const rawMarker = typeof data.fileDataUrl === 'string' ? data.fileDataUrl : '';
    const parsed = parseChunkedMarker(rawMarker);
    if (!parsed) {
      return {
        ...mapped,
        rawFileDataUrl: rawMarker,
      };
    }

    const parts = chunkMap.get(`${mapped.id}:${parsed.nonce}`);
    if (parts && parts.size === parsed.totalChunks) {
      const joined: string[] = [];
      let complete = true;
      for (let i = 0; i < parsed.totalChunks; i++) {
        const piece = parts.get(i);
        if (piece === undefined) {
          complete = false;
          break;
        }
        joined.push(piece);
      }
      if (complete) {
        return {
          ...mapped,
          fileDataUrl: joined.join(''),
          rawFileDataUrl: rawMarker,
        };
      }
    }

    return {
      ...mapped,
      fileDataUrl: undefined,
      rawFileDataUrl: rawMarker,
    };
  });
}

export function mapDocToComplianceCheck(
  data: Record<string, unknown>
): ComplianceCheckFirestoreDoc {
  const normStatus = (val: unknown): ComplianceDocStatus =>
    VALID_COMPLIANCE_STATUS.has(val as ComplianceDocStatus)
      ? (val as ComplianceDocStatus)
      : 'OK';

  return {
    id: String(data.id ?? ''),
    ownerId: String(data.ownerId ?? ''),
    month: VALID_COMPLIANCE_MONTHS.has(data.month as ComplianceMonth)
      ? (data.month as ComplianceMonth)
      : 'JANEIRO',
    operation: VALID_COMPLIANCE_OPERATIONS.has(data.operation as ComplianceOperation)
      ? (data.operation as ComplianceOperation)
      : 'ENTREGA',
    checkDate: clampStr(data.checkDate, 40),
    unit: clampStr(data.unit, 80, 'Guarabira') || 'Guarabira',
    plate: clampStr(data.plate, 20),
    crlvAno: normStatus(data.crlvAno),
    cronotacografo: normStatus(data.cronotacografo),
    antt: normStatus(data.antt),
    contratoLocacao: normStatus(data.contratoLocacao),
    notes: clampStr(data.notes, 500),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  };
}

export async function upsertFleetMeta(
  ownerId: string,
  lastUpdatedDisplay: string,
  initialized = true
): Promise<void> {
  const path = `fleetMeta/${ownerId}`;
  try {
    const ref = doc(db, 'fleetMeta', ownerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId,
        lastUpdatedDisplay: clampStr(lastUpdatedDisplay, 40, 'Atualizado'),
        initialized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        lastUpdatedDisplay: clampStr(lastUpdatedDisplay, 40, 'Atualizado'),
        initialized,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

type BatchAction = (batch: WriteBatch) => void;

/**
 * Firestore Security Rules enforce a hard limit of 20 document access calls
 * (existsAfter / getAfter / get / exists) per transaction or WriteBatch.
 * By committing each vehicle's bundle (1 parent + up to 6 child writes) in its
 * own atomic batch, every batch touches at most 1 parent path and <= 16 lookups.
 */
async function commitGroupedBatches(
  groups: BatchAction[][],
  options: { maxOpsPerBatch?: number; concurrency?: number } = {}
): Promise<void> {
  const maxOps = options.maxOpsPerBatch ?? 7;
  const concurrency = options.concurrency ?? 4;

  const commitSingleGroup = async (group: BatchAction[]) => {
    for (let i = 0; i < group.length; i += maxOps) {
      const slice = group.slice(i, i + maxOps);
      const batch = writeBatch(db);
      for (const op of slice) {
        op(batch);
      }
      await batch.commit();
    }
  };

  for (let i = 0; i < groups.length; i += concurrency) {
    const window = groups.slice(i, i + concurrency);
    await Promise.all(window.map((group) => commitSingleGroup(group)));
  }
}

export async function saveVehicleBundle(
  vehicle: Vehicle,
  ownerId: string,
  isEdit: boolean,
  existingVehicle?: VehicleFirestoreDoc,
  existingDocs: DocumentFirestoreDoc[] = [],
  existingEvidence?: EvidenceFirestoreDoc,
  lastUpdatedDisplay?: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(vehicle.id);
  let activePath = `vehicles/${safeId}`;
  try {
    const vehicleOps: BatchAction[] = [];
    const childOps: BatchAction[] = [];

    if (isEdit && existingVehicle) {
      const targetOwnerId = existingVehicle.ownerId || ownerId;
      const fullPayload = sanitizeVehicleForFirestore(
        { ...vehicle, id: safeId },
        targetOwnerId,
        existingVehicle.createdAt
      );
      const { id: _id, ownerId: _ownerId, createdAt: _createdAt, ...updatableFields } = fullPayload;
      vehicleOps.push((batch) =>
        batch.update(doc(db, 'vehicles', safeId), updatableFields)
      );

      for (const d of existingDocs) {
        if (d.vehicleId === safeId) {
          childOps.push((batch) =>
            batch.update(doc(db, 'documents', d.id), {
              plate: clampStr(vehicle.plate.trim().toUpperCase(), 20, 'SEM-PLACA'),
              model: clampStr(vehicle.manufacturerModel.trim(), 160, 'Não informado'),
              sector: VALID_SECTORS.has(vehicle.sector) ? vehicle.sector : 'Distribuição',
              updatedAt: serverTimestamp(),
            })
          );
        }
      }

      if (existingEvidence) {
        childOps.push((batch) =>
          batch.update(doc(db, 'evidences', safeId), {
            plate: clampStr(vehicle.plate.trim().toUpperCase(), 20, 'SEM-PLACA'),
            model: clampStr(vehicle.manufacturerModel.trim(), 160, 'Não informado'),
            sector: VALID_SECTORS.has(vehicle.sector) ? vehicle.sector : 'Distribuição',
            updatedAt: serverTimestamp(),
          })
        );
      }
    } else {
      vehicleOps.push((batch) =>
        batch.set(
          doc(db, 'vehicles', safeId),
          sanitizeVehicleForFirestore({ ...vehicle, id: safeId }, ownerId)
        )
      );

      const newEvidence: VehicleEvidenceRecord = {
        vehicleId: safeId,
        plate: vehicle.plate,
        model: vehicle.manufacturerModel,
        sector: vehicle.sector,
        crlv: true,
        cnt: true,
        antt: true,
        crlvFile: `CRLV_${vehicle.plate}.pdf`,
        cntFile: `CNT_${vehicle.plate}.pdf`,
        anttFile: `ANTT_${vehicle.plate}.pdf`,
        updatedAt: new Date().toLocaleDateString('pt-BR'),
      };
      childOps.push((batch) =>
        batch.set(doc(db, 'evidences', safeId), sanitizeEvidenceForFirestore(newEvidence, ownerId))
      );

      const docId = `doc-${Date.now()}`;
      const newDoc: VehicleDocumentRecord = {
        id: docId,
        vehicleId: safeId,
        plate: vehicle.plate,
        model: vehicle.manufacturerModel,
        sector: vehicle.sector,
        type: 'CRLV',
        status: 'Regular',
        expiryDate: vehicle.expiryDates.crlv,
        protocol: `CRLV-${Math.floor(10000 + Math.random() * 90000)}`,
        responsible: 'Gestão Brejo',
      };
      childOps.push((batch) =>
        batch.set(doc(db, 'documents', docId), sanitizeDocumentForFirestore(newDoc, ownerId))
      );
    }

    await commitGroupedBatches([vehicleOps], { maxOpsPerBatch: 1, concurrency: 1 });
    if (childOps.length > 0) {
      activePath = `documents/evidences (${safeId})`;
      await commitGroupedBatches([childOps], { maxOpsPerBatch: 2, concurrency: 4 });
    }

    if (lastUpdatedDisplay) {
      await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, activePath);
  }
}

export async function importFleetToFirestore(
  imported: Vehicle[],
  mode: 'merge' | 'replace',
  ownerId: string,
  existingVehicles: VehicleFirestoreDoc[],
  existingDocuments: DocumentFirestoreDoc[],
  existingEvidences: EvidenceFirestoreDoc[],
  lastUpdatedDisplay: string
): Promise<string> {
  let activePath = 'vehicles';
  try {
    const normPlate = (p: string) => p.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (mode === 'replace' && existingVehicles.length > 0) {
      await clearAllFleetInFirestore(
        ownerId,
        existingVehicles.map((v) => v.id),
        existingDocuments.map((d) => d.id),
        existingEvidences.map((e) => e.vehicleId),
        lastUpdatedDisplay,
        false
      );
    }

    const activeExisting = mode === 'replace' ? [] : existingVehicles;
    const existingByPlate = new Map<string, VehicleFirestoreDoc>();
    for (const v of activeExisting) {
      existingByPlate.set(normPlate(v.plate), v);
    }

    const docsByVehicleId = new Map<string, DocumentFirestoreDoc[]>();
    for (const d of existingDocuments) {
      const list = docsByVehicleId.get(d.vehicleId) ?? [];
      list.push(d);
      docsByVehicleId.set(d.vehicleId, list);
    }
    const evByVehicleId = new Map(existingEvidences.map((e) => [e.vehicleId, e]));

    const vehicleOps: BatchAction[] = [];
    const childGroups: BatchAction[][] = [];
    let firstSelectedId = '';

    const dedupedByPlate = new Map<string, Vehicle>();
    for (const imp of imported) {
      dedupedByPlate.set(normPlate(imp.plate) || imp.id, imp);
    }

    for (const imp of dedupedByPlate.values()) {
      const key = normPlate(imp.plate);
      const match = key ? existingByPlate.get(key) : undefined;
      const targetId = match ? match.id : sanitizeFirestoreId(imp.id);
      if (!firstSelectedId) firstSelectedId = targetId;

      const targetOwnerId = match?.ownerId || ownerId;

      const vehicleToSave: Vehicle = {
        ...imp,
        id: targetId,
        photoUrl: resolveVehiclePhoto(imp.plate, imp.category, match?.photoUrl || imp.photoUrl),
      };

      if (match) {
        const fullPayload = sanitizeVehicleForFirestore(vehicleToSave, targetOwnerId, match.createdAt);
        const { id: _id, ownerId: _ownerId, createdAt: _createdAt, ...updatableFields } = fullPayload;
        vehicleOps.push((batch) => batch.update(doc(db, 'vehicles', targetId), updatableFields));
      } else {
        vehicleOps.push((batch) =>
          batch.set(
            doc(db, 'vehicles', targetId),
            sanitizeVehicleForFirestore(vehicleToSave, targetOwnerId)
          )
        );
      }

      const childGroup: BatchAction[] = [];

      if (match) {
        const oldDocs = docsByVehicleId.get(match.id) ?? [];
        for (const od of oldDocs) {
          childGroup.push((batch) => batch.delete(doc(db, 'documents', od.id)));
        }
      }

      const freshDocs = buildDocumentsForVehicle(vehicleToSave);
      for (const fd of freshDocs) {
        childGroup.push((batch) =>
          batch.set(doc(db, 'documents', fd.id), sanitizeDocumentForFirestore(fd, targetOwnerId))
        );
      }

      const builtEv = buildEvidenceForVehicle(vehicleToSave);
      const oldEv = match ? evByVehicleId.get(match.id) : undefined;
      const mergedEv: VehicleEvidenceRecord = oldEv
        ? {
            ...builtEv,
            crlv: oldEv.crlv || builtEv.crlv,
            cnt: oldEv.cnt || builtEv.cnt,
            antt: oldEv.antt || builtEv.antt,
            crlvFile: oldEv.crlvFile ?? builtEv.crlvFile,
            cntFile: oldEv.cntFile ?? builtEv.cntFile,
            anttFile: oldEv.anttFile ?? builtEv.anttFile,
          }
        : builtEv;

      if (oldEv) {
        const fullEv = sanitizeEvidenceForFirestore(mergedEv, targetOwnerId, oldEv.createdAt);
        const {
          vehicleId: _vehId,
          ownerId: _evOwnerId,
          createdAt: _evCreatedAt,
          ...updatableEv
        } = fullEv;
        childGroup.push((batch) => batch.update(doc(db, 'evidences', targetId), updatableEv));
      } else {
        childGroup.push((batch) =>
          batch.set(
            doc(db, 'evidences', targetId),
            sanitizeEvidenceForFirestore(mergedEv, targetOwnerId)
          )
        );
      }

      if (childGroup.length > 0) {
        childGroups.push(childGroup);
      }
    }

    await commitGroupedBatches([vehicleOps], { maxOpsPerBatch: 1, concurrency: 6 });
    if (childGroups.length > 0) {
      activePath = 'documents/evidences/vehiclePhotos';
      await commitGroupedBatches(childGroups, { maxOpsPerBatch: 2, concurrency: 6 });
    }
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
    return firstSelectedId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, activePath);
  }
}

export async function deleteVehicleBundle(
  vehicleId: string,
  documents: DocumentFirestoreDoc[],
  hasEvidence: boolean,
  hasCustomPhoto: boolean,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(vehicleId);
  const path = `vehicles/${safeId}`;
  try {
    const ops: BatchAction[] = [
      (batch) => batch.delete(doc(db, 'vehicles', safeId)),
    ];
    for (const d of documents) {
      if (d.vehicleId === safeId) {
        ops.push((batch) => batch.delete(doc(db, 'documents', d.id)));
      }
    }
    if (hasEvidence) {
      ops.push((batch) => batch.delete(doc(db, 'evidences', safeId)));
    }
    if (hasCustomPhoto) {
      ops.push((batch) => batch.delete(doc(db, 'vehiclePhotos', safeId)));
    }
    await commitGroupedBatches([ops], { maxOpsPerBatch: 15, concurrency: 4 });
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllFleetInFirestore(
  ownerId: string,
  vehicleIds: string[],
  documentIds: string[],
  evidenceIds: string[],
  lastUpdatedDisplay: string,
  updateMeta = true
): Promise<void> {
  const path = 'vehicles';
  try {
    const ops: BatchAction[] = [];
    for (const id of documentIds) {
      ops.push((batch) => batch.delete(doc(db, 'documents', id)));
    }
    for (const id of evidenceIds) {
      ops.push((batch) => batch.delete(doc(db, 'evidences', id)));
    }
    for (const id of vehicleIds) {
      ops.push((batch) => batch.delete(doc(db, 'vehiclePhotos', id)));
      ops.push((batch) => batch.delete(doc(db, 'vehicles', id)));
    }

    // Also ensure any orphan photo docs are cleaned up
    const photoSnap = await getDocs(buildCollectionQuery('vehiclePhotos'));
    const queuedVehicleIds = new Set(vehicleIds);
    photoSnap.forEach((docSnap) => {
      if (!queuedVehicleIds.has(docSnap.id)) {
        ops.push((batch) => batch.delete(doc(db, 'vehiclePhotos', docSnap.id)));
      }
    });

    const chunks: BatchAction[][] = [];
    for (let i = 0; i < ops.length; i += 15) {
      chunks.push(ops.slice(i, i + 15));
    }
    await commitGroupedBatches(chunks, { maxOpsPerBatch: 15, concurrency: 4 });

    if (updateMeta) {
      await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleVehicleStatusInFirestore(
  vehicle: VehicleFirestoreDoc,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const path = `vehicles/${vehicle.id}`;
  const nextStatus: VehicleStatus = vehicle.status === 'Ativo' ? 'Parado' : 'Ativo';
  try {
    await updateDoc(doc(db, 'vehicles', vehicle.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveVehiclePhotoInFirestore(
  vehicle: VehicleFirestoreDoc,
  dataUrl: string,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const path = `vehiclePhotos/${vehicle.id}`;
  try {
    const targetOwnerId = vehicle.ownerId || ownerId;
    const ref = doc(db, 'vehiclePhotos', vehicle.id);
    const snap = await getDoc(ref);
    const clampedDataUrl = clampStr(dataUrl, 450000);
    if (!snap.exists()) {
      await setDoc(ref, {
        vehicleId: vehicle.id,
        ownerId: targetOwnerId,
        plate: clampStr(vehicle.plate, 20),
        dataUrl: clampedDataUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        plate: clampStr(vehicle.plate, 20),
        dataUrl: clampedDataUrl,
        updatedAt: serverTimestamp(),
      });
    }
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateVehicleChecklistInFirestore(
  vehicle: VehicleFirestoreDoc,
  nextChecklist: Record<ChecklistKey, boolean>,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const path = `vehicles/${vehicle.id}`;
  try {
    await updateDoc(doc(db, 'vehicles', vehicle.id), {
      checklist: normalizeChecklist(nextChecklist),
      updatedAt: serverTimestamp(),
    });
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateDocumentInFirestore(
  docId: string,
  status: DocumentStatus,
  expiryDate: string,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const path = `documents/${docId}`;
  try {
    await updateDoc(doc(db, 'documents', docId), {
      status: VALID_DOC_STATUS.has(status) ? status : 'Regular',
      expiryDate: clampStr(expiryDate, 40),
      updatedAt: serverTimestamp(),
    });
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addDocumentInFirestore(
  record: VehicleDocumentRecord,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(record.id);
  const path = `documents/${safeId}`;
  try {
    await setDoc(
      doc(db, 'documents', safeId),
      sanitizeDocumentForFirestore({ ...record, id: safeId }, ownerId)
    );
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleEvidenceFieldInFirestore(
  evidence: EvidenceFirestoreDoc,
  field: 'crlv' | 'cnt' | 'antt',
  fileName: string | undefined,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const path = `evidences/${evidence.vehicleId}`;
  const nextVal = fileName ? true : !evidence[field];
  const fileKey =
    field === 'crlv' ? 'crlvFile' : field === 'cnt' ? 'cntFile' : 'anttFile';
  const nextFile =
    fileName ?? (nextVal ? `${field.toUpperCase()}_${evidence.plate}.pdf` : '');
  try {
    await updateDoc(doc(db, 'evidences', evidence.vehicleId), {
      [field]: nextVal,
      [fileKey]: clampStr(nextFile, 200),
      updatedDate: new Date().toLocaleDateString('pt-BR'),
      updatedAt: serverTimestamp(),
    });
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function seedFleetToFirestore(
  vehicles: Vehicle[],
  documents: VehicleDocumentRecord[],
  evidences: VehicleEvidenceRecord[],
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  let activePath = 'vehicles';
  try {
    const docsByVehicle = new Map<string, VehicleDocumentRecord[]>();
    const seenDocIds = new Set<string>();
    for (const d of documents) {
      const safeVehId = sanitizeFirestoreId(d.vehicleId || '');
      const safeDocId = sanitizeFirestoreId(d.id || `${safeVehId}-${d.type}`);
      if (seenDocIds.has(safeDocId)) continue;
      seenDocIds.add(safeDocId);
      const list = docsByVehicle.get(safeVehId) ?? [];
      list.push({ ...d, id: safeDocId, vehicleId: safeVehId });
      docsByVehicle.set(safeVehId, list);
    }

    const evByVehicle = new Map<string, VehicleEvidenceRecord>();
    for (const e of evidences) {
      const safeVehId = sanitizeFirestoreId(e.vehicleId || '');
      evByVehicle.set(safeVehId, { ...e, vehicleId: safeVehId });
    }

    const vehicleOps: BatchAction[] = [];
    const docGroups: BatchAction[][] = [];
    const evidenceOps: BatchAction[] = [];
    const seenVehicleIds = new Set<string>();

    for (const v of vehicles) {
      const safeVehId = sanitizeFirestoreId(v.id || v.plate || '');
      if (seenVehicleIds.has(safeVehId)) continue;
      seenVehicleIds.add(safeVehId);

      vehicleOps.push((batch) =>
        batch.set(
          doc(db, 'vehicles', safeVehId),
          sanitizeVehicleForFirestore({ ...v, id: safeVehId }, ownerId)
        )
      );

      const vDocs = docsByVehicle.get(safeVehId) ?? [];
      if (vDocs.length > 0) {
        docGroups.push(
          vDocs.map((d) => (batch) =>
            batch.set(
              doc(db, 'documents', d.id),
              sanitizeDocumentForFirestore(d, ownerId)
            )
          )
        );
      }

      const vEv = evByVehicle.get(safeVehId);
      if (vEv) {
        evidenceOps.push((batch) =>
          batch.set(
            doc(db, 'evidences', safeVehId),
            sanitizeEvidenceForFirestore(vEv, ownerId)
          )
        );
      }
    }

    if (vehicleOps.length > 0) {
      activePath = 'vehicles';
      await commitGroupedBatches([vehicleOps], { maxOpsPerBatch: 1, concurrency: 6 });
    }
    if (docGroups.length > 0) {
      activePath = 'documents';
      await commitGroupedBatches(docGroups, { maxOpsPerBatch: 2, concurrency: 6 });
    }
    if (evidenceOps.length > 0) {
      activePath = 'evidences';
      await commitGroupedBatches([evidenceOps], { maxOpsPerBatch: 2, concurrency: 6 });
    }

    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, activePath);
  }
}

export async function loadDefaultFleetToFirestore(
  ownerId: string,
  lastUpdatedDisplay: string,
  existingVehicles: VehicleFirestoreDoc[] = [],
  existingDocuments: DocumentFirestoreDoc[] = [],
  existingEvidences: EvidenceFirestoreDoc[] = []
): Promise<void> {
  const vehiclesWithPhotos = INITIAL_VEHICLES.map((v) => ({
    ...v,
    photoUrl: resolveVehiclePhoto(v.plate, v.category, v.photoUrl),
  }));
  if (existingVehicles.length > 0) {
    await importFleetToFirestore(
      vehiclesWithPhotos,
      'merge',
      ownerId,
      existingVehicles,
      existingDocuments,
      existingEvidences,
      lastUpdatedDisplay
    );
    return;
  }
  await seedFleetToFirestore(
    vehiclesWithPhotos,
    INITIAL_DOCUMENTS,
    INITIAL_EVIDENCES,
    ownerId,
    lastUpdatedDisplay
  );
}

export function buildCollectionQuery(collectionName: string) {
  return query(
    collection(db, collectionName),
    where('ownerId', '==', SHARED_WORKSPACE_ID)
  );
}

async function writeLegalizedChunks(
  safeParentId: string,
  rawDataUrl: string,
  folder: LegalizedFolderName,
  uploadedAt: string,
  ownerId: string
): Promise<string> {
  const safeFolder = VALID_LEGALIZED_FOLDERS.has(folder) ? folder : 'ANTT';
  const safeUploadedAt = clampStr(uploadedAt, 40);
  const nonce = generateChunkNonce();

  const slices: string[] = [];
  for (let offset = 0; offset < rawDataUrl.length; offset += LEGALIZED_CHUNK_SIZE) {
    slices.push(rawDataUrl.slice(offset, offset + LEGALIZED_CHUNK_SIZE));
  }
  const totalChunks = slices.length;

  const chunkGroups: BatchAction[][] = slices.map((slice, idx) => {
    const chunkId = buildChunkDocId(safeParentId, nonce, idx);
    const chunkPayload = {
      id: chunkId,
      ownerId,
      folder: safeFolder,
      subfolder: '',
      fileName: clampStr(`__CHUNK__:${safeParentId}:${nonce}:${idx}:${totalChunks}`, 200),
      fileType: LEGALIZED_CHUNK_MIME,
      fileSize: slice.length,
      plate: '',
      expiryDate: '',
      referenceDate: '',
      notes: '',
      uploadedAt: safeUploadedAt,
      fileDataUrl: slice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return [(batch) => batch.set(doc(db, 'legalizedDocs', chunkId), chunkPayload)];
  });

  await commitGroupedBatches(chunkGroups, { maxOpsPerBatch: 1, concurrency: 4 });
  return `${CHUNKED_MARKER_PREFIX}${nonce}:${totalChunks}`;
}

async function deleteLegalizedChunksQuietly(
  safeParentId: string,
  rawMarker?: string
): Promise<void> {
  const parsed = parseChunkedMarker(rawMarker);
  if (!parsed) return;
  const chunkIds: string[] = [];
  for (let idx = 0; idx < parsed.totalChunks; idx++) {
    chunkIds.push(buildChunkDocId(safeParentId, parsed.nonce, idx));
  }
  const concurrency = 4;
  for (let i = 0; i < chunkIds.length; i += concurrency) {
    const slice = chunkIds.slice(i, i + concurrency);
    await Promise.allSettled(
      slice.map((chunkId) => deleteDoc(doc(db, 'legalizedDocs', chunkId)))
    );
  }
}

export async function addLegalizedDocInFirestore(
  item: LegalizedDocumentRecord,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(item.id);
  const path = `legalizedDocs/${safeId}`;
  try {
    const rawDataUrl = typeof item.fileDataUrl === 'string' ? item.fileDataUrl : '';
    const byteLen = utf8Encoder.encode(rawDataUrl).length;
    let storedFileDataUrl = '';

    if (byteLen > 0 && byteLen <= MAX_LEGALIZED_INLINE_BYTES) {
      storedFileDataUrl = rawDataUrl;
    } else if (byteLen > MAX_LEGALIZED_INLINE_BYTES && byteLen <= MAX_LEGALIZED_FILE_DATAURL_BYTES) {
      storedFileDataUrl = await writeLegalizedChunks(
        safeId,
        rawDataUrl,
        item.folder,
        item.uploadedAt,
        ownerId
      );
    }

    await setDoc(
      doc(db, 'legalizedDocs', safeId),
      sanitizeLegalizedDocForFirestore(
        { ...item, id: safeId, fileDataUrl: storedFileDataUrl },
        ownerId
      )
    );
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateLegalizedDocInFirestore(
  existingItem: LegalizedDocFirestoreDoc,
  patch: Partial<LegalizedDocumentRecord>,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(existingItem.id);
  const path = `legalizedDocs/${safeId}`;
  try {
    const targetOwnerId = existingItem.ownerId || ownerId;
    const oldRawMarker = existingItem.rawFileDataUrl ?? existingItem.fileDataUrl ?? '';
    const isReplacingFile = patch.fileDataUrl !== undefined;

    let storedFileDataUrl = oldRawMarker;
    let shouldDeleteOldChunks = false;

    if (isReplacingFile) {
      const nextRaw = typeof patch.fileDataUrl === 'string' ? patch.fileDataUrl : '';
      const byteLen = utf8Encoder.encode(nextRaw).length;
      if (byteLen === 0) {
        storedFileDataUrl = '';
        shouldDeleteOldChunks = true;
      } else if (byteLen <= MAX_LEGALIZED_INLINE_BYTES) {
        storedFileDataUrl = nextRaw;
        shouldDeleteOldChunks = true;
      } else if (byteLen <= MAX_LEGALIZED_FILE_DATAURL_BYTES) {
        storedFileDataUrl = await writeLegalizedChunks(
          safeId,
          nextRaw,
          patch.folder ?? existingItem.folder,
          patch.uploadedAt ?? existingItem.uploadedAt,
          targetOwnerId
        );
        shouldDeleteOldChunks = true;
      }
    }

    const merged: LegalizedDocumentRecord = {
      ...existingItem,
      ...patch,
      id: safeId,
      fileDataUrl: storedFileDataUrl,
    };
    const full = sanitizeLegalizedDocForFirestore(merged, targetOwnerId, existingItem.createdAt);
    const { id: _id, ownerId: _ownerId, createdAt: _createdAt, ...updatable } = full;
    await updateDoc(doc(db, 'legalizedDocs', safeId), updatable);

    if (shouldDeleteOldChunks) {
      await deleteLegalizedChunksQuietly(safeId, oldRawMarker);
    }

    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLegalizedDocInFirestore(
  docId: string,
  ownerId: string,
  lastUpdatedDisplay: string,
  rawFileDataUrl?: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(docId);
  const path = `legalizedDocs/${safeId}`;
  try {
    await deleteDoc(doc(db, 'legalizedDocs', safeId));
    await deleteLegalizedChunksQuietly(safeId, rawFileDataUrl);
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addComplianceChecksInFirestore(
  items: ComplianceCheckRecord[],
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  if (items.length === 0) return;
  const path = 'complianceChecks';
  try {
    const ops: BatchAction[] = items.map((item) => {
      const safeId = sanitizeFirestoreId(item.id);
      return (batch) =>
        batch.set(
          doc(db, 'complianceChecks', safeId),
          sanitizeComplianceCheckForFirestore({ ...item, id: safeId }, ownerId)
        );
    });
    await commitGroupedBatches([ops], { maxOpsPerBatch: 15, concurrency: 4 });
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateComplianceCheckInFirestore(
  existingItem: ComplianceCheckFirestoreDoc,
  patch: Partial<ComplianceCheckRecord>,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(existingItem.id);
  const path = `complianceChecks/${safeId}`;
  try {
    const targetOwnerId = existingItem.ownerId || ownerId;
    const merged: ComplianceCheckRecord = {
      ...existingItem,
      ...patch,
      id: safeId,
    };
    const full = sanitizeComplianceCheckForFirestore(
      merged,
      targetOwnerId,
      existingItem.createdAt
    );
    const { id: _id, ownerId: _ownerId, createdAt: _createdAt, ...updatable } = full;
    await updateDoc(doc(db, 'complianceChecks', safeId), updatable);
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteComplianceCheckInFirestore(
  checkId: string,
  ownerId: string,
  lastUpdatedDisplay: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(checkId);
  const path = `complianceChecks/${safeId}`;
  try {
    await deleteDoc(doc(db, 'complianceChecks', safeId));
    await upsertFleetMeta(ownerId, lastUpdatedDisplay, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
