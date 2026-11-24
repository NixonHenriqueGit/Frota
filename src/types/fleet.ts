export type VehicleCategory =
  | 'Caminhão'
  | 'Carga Semi-Reboque'
  | 'Empilhadeira'
  | 'Frota Leve'
  | 'Tração Caminhão Trator';

export type Sector =
  | 'Distribuição'
  | 'Vendas'
  | 'Puxada'
  | 'Armazém'
  | 'Marketing';

export type Company =
  | 'Pau Brasil Matriz'
  | 'Pau Brasil Brejo'
  | 'Terceirizados';

export type VehicleStatus = 'Ativo' | 'Parado';

export type OwnershipType = 'Próprio' | 'Terceiro';

export type DocumentStatus = 'Regular' | 'A vencer' | 'Vencido';

export type DocumentType =
  | 'CRLV'
  | 'IPVA'
  | 'Cronotacógrafo'
  | 'ANTT'
  | 'Alvará Vigilância Sanitária'
  | 'Extintor';

export type ChecklistKey =
  | 'macaco'
  | 'chaveRoda'
  | 'caboForca'
  | 'pinoCambao'
  | 'triangulo'
  | 'extintor'
  | 'cofre'
  | 'tacografo'
  | 'step'
  | 'plataforma'
  | 'estribo'
  | 'kitErgonomico'
  | 'sensorCinto'
  | 'cones'
  | 'pneus';

export interface ChecklistDefinition {
  key: ChecklistKey;
  label: string;
}

export interface VehicleDocumentRecord {
  id: string;
  vehicleId: string;
  plate: string;
  model: string;
  sector: Sector;
  type: DocumentType;
  status: DocumentStatus;
  expiryDate: string; // DD/MM/YYYY
  protocol: string;
  responsible: string;
}

export interface VehicleEvidenceRecord {
  vehicleId: string;
  plate: string;
  model: string;
  sector: Sector;
  crlv: boolean;
  cnt: boolean;
  antt: boolean;
  crlvFile?: string;
  cntFile?: string;
  anttFile?: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  fleetNumber: string;
  typeCode: string;
  category: VehicleCategory;
  sector: Sector;
  company: Company;
  status: VehicleStatus;
  manufacturer: string;
  model: string;
  manufacturerModel: string;
  axles: string;
  yearFab: number;
  yearMod: number;
  color: string;
  logoBrand: string;
  operationYear: string;
  kmOrHours: number;
  unit: 'km' | 'h';
  bodywork: string;
  tare: string;
  pbt: string;
  ownership: OwnershipType;
  hbFrota: boolean;
  renavam: string;
  chassi: string;
  extinguisherSerial: string;
  tankCapacity: string;
  capacityPallets: string;
  cargoCapacity: string;
  fuelType: string;
  status2: string;
  fipeValue: number;
  currentValue: number;
  fipeCode: string;
  fleetAgeYears: string;
  replacementTermYears: string;
  replacementTermKmHours: string;
  expectedReplacementMonthYear: string;
  purchaseYear: string;
  fleetAgeYearMonths: string;
  finalStatus: string;
  expiryDates: {
    crlv: string;
    ipva: string;
    antt: string;
    cnt: string;
    alvaraSanitario: string;
    extintor: string;
    cronotacografo: string;
  };
  checklist: Record<ChecklistKey, boolean>;
  photoUrl: string;
  periodBucket: '30d' | '6m' | '12m';
  lastUpdated: string;
}

export interface Driver {
  id: string;
  name: string;
  cnh: string;
  cnhCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AE';
  cnhExpiry: string;
  phone: string;
  sector: Sector;
  assignedPlates: string[];
  status: 'Ativo' | 'Férias' | 'Afastado';
}

export type LegalizedFolderName =
  | 'ANTT'
  | 'CONTRATO DE LOCAÇÃO VEICULAR'
  | 'CRLV'
  | 'CRONOTACÓGRAFOS';

export type CrlvSubfolderName = 'ENTREGA' | 'FROTA LEVE' | 'PUXADA';

export interface LegalizedDocumentRecord {
  id: string;
  folder: LegalizedFolderName;
  subfolder?: CrlvSubfolderName | '';
  fileName: string;
  fileType: string;
  fileSize: number;
  plate: string;
  expiryDate: string;
  referenceDate: string;
  notes: string;
  uploadedAt: string;
  fileDataUrl?: string;
}

export type NavSection =
  | 'documentos-legalizados'
  | 'processo-garantia'
  | 'visao-geral'
  | 'cadastro'
  | 'documentos'
  | 'evidencias'
  | 'checklists';

export interface DashboardFilters {
  period: '12m' | '6m' | '30d' | 'all';
  company: 'Todas' | Company;
  sector: 'Todos' | Sector;
  category: 'Todos' | VehicleCategory;
  status: 'Todos' | VehicleStatus;
  search: string;
}
