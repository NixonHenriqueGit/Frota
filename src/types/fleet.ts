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
  | 'CRONOTACÓGRAFOS'
  | 'LAUDO DE VIGILÂNCIA SANITÁRIA'
  | 'PADRÕES DE EQUIPAMENTOS'
  | 'PADRÕES VISUAIS'
  | 'CHECK DE SEGURANÇA'
  | 'BLITZ DE ENTREGA'
  | 'BLITZ DE PUXADA'
  | 'BLITZ EMPILHADEIRA'
  | 'CAMINHÕES'
  | 'PUXADA'
  | 'MELHORIA PROGRESSIVA'
  | 'ESTRATIFICAÇÃO PROBLEMAS'
  | 'DTO'
  | 'RECIBOS';

export type BlitzKind = 'entrega' | 'puxada' | 'empilhadeira';

export type BlitzItemStatus = 'OK' | 'NOK' | 'NA';

export type BlitzZoneKey =
  | 'cabine'
  | 'frente'
  | 'bau'
  | 'traseira'
  | 'pneus'
  | 'eletrica'
  | 'torre'
  | 'sinalizacao';

export interface BlitzZoneDef {
  key: BlitzZoneKey;
  label: string;
  shortLabel: string;
}

export interface BlitzChecklistItemDef {
  id: string;
  zone: BlitzZoneKey;
  label: string;
}

export type BlitzEntregaItemDef = BlitzChecklistItemDef;

export interface BlitzInspectionPayload {
  id: string;
  displayId: string;
  mes: ComplianceMonth;
  criador: string;
  data: string;
  hora: string;
  percentual: number;
  mapa: string;
  placa: string;
  nome: string;
  cpf: string;
  momento?: StratifiedProblemMoment;
  items: Record<string, BlitzItemStatus>;
}

export type BlitzEntregaPayload = BlitzInspectionPayload;

export type CaminhoesZoneKey =
  | 'cabine'
  | 'frontal'
  | 'bau'
  | 'traseira'
  | 'pneus'
  | 'extras';

export interface CaminhoesCheckColumnDef {
  id: string;
  zone: CaminhoesZoneKey;
  tipo: string;
  item: string;
  classificacao: string;
  gravidade: string;
}

export interface CaminhoesCheckPayload {
  id: string;
  mes: ComplianceMonth;
  placa: string;
  data: string;
  responsavel: string;
  percentual: number;
  momento?: StratifiedProblemMoment;
  items: Record<string, BlitzItemStatus>;
}

export type PuxadaZoneKey =
  | 'cabine'
  | 'frontal'
  | 'sider'
  | 'plataforma'
  | 'traseira'
  | 'pneus'
  | 'extras';

export interface PuxadaCheckColumnDef {
  id: string;
  zone: PuxadaZoneKey;
  tipo: string;
  item: string;
  classificacao: string;
  gravidade: string;
}

export interface PuxadaCheckPayload {
  id: string;
  mes: ComplianceMonth;
  placa: string;
  data: string;
  responsavel: string;
  percentual: number;
  momento?: StratifiedProblemMoment;
  items: Record<string, BlitzItemStatus>;
}

export type SafetyCheckOperation = 'ENTREGA' | 'PUXADA' | 'ARMAZÉM';

export type SafetyCheckMonthKey =
  | 'jan'
  | 'fev'
  | 'mar'
  | 'abr'
  | 'mai'
  | 'jun'
  | 'jul'
  | 'ago'
  | 'set'
  | 'out'
  | 'nov'
  | 'dez';

export interface SafetyCheckRowPayload {
  id: string;
  operation: SafetyCheckOperation;
  unit: string;
  plate: string;
  months: Partial<Record<SafetyCheckMonthKey, number | null>>;
  notes?: string;
}

export type CrlvSubfolderName = 'ENTREGA' | 'FROTA LEVE' | 'PUXADA';

export type VisualStandardScope = 'frota' | 'equipamentos';

export type VisualCheckStatus = 'CONFORME' | 'BLOQUEIO' | 'NA';

export interface VisualChecklistItemDef {
  id: string;
  order: number;
  name: string;
  application: string;
  severity: 'SEGURANÇA – BLOQUEIO' | 'QUALIDADE – BLOQUEIO';
  anomaly: string;
  imageUrl?: string;
}

export interface VisualCheckItemResponse {
  status: VisualCheckStatus;
  note?: string;
}

export interface VisualValidationPayload {
  scope: VisualStandardScope;
  assetLabel: string;
  modalType: string;
  inspector: string;
  validatedAt: string;
  generalNotes?: string;
  items: Record<string, VisualCheckItemResponse>;
}

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

export type ComplianceDocStatus = 'OK' | 'NOK' | 'N/A';

export type ComplianceOperation = 'ENTREGA' | 'PUXADA' | 'FROTA LEVE';

export type ComplianceMonth =
  | 'JANEIRO'
  | 'FEVEREIRO'
  | 'MARÇO'
  | 'ABRIL'
  | 'MAIO'
  | 'JUNHO'
  | 'JULHO'
  | 'AGOSTO'
  | 'SETEMBRO'
  | 'OUTUBRO'
  | 'NOVEMBRO'
  | 'DEZEMBRO';

export interface ComplianceCheckRecord {
  id: string;
  month: ComplianceMonth;
  operation: ComplianceOperation;
  checkDate: string; // DD/MM/YYYY
  unit: string;
  plate: string;
  crlvAno: ComplianceDocStatus;
  cronotacografo: ComplianceDocStatus;
  antt: ComplianceDocStatus;
  contratoLocacao: ComplianceDocStatus;
  notes: string;
}

export type NavSection =
  | 'bloco-1'
  | 'documentos-legalizados'
  | 'processo-garantia'
  | 'laudo-vigilancia'
  | 'check-conformidade'
  | 'padroes-equipamentos'
  | 'padroes-visuais'
  | 'lista-requisitos'
  | 'melhoria-progressiva'
  | 'estratificacao-problemas'
  | 'qualidade-iv'
  | 'tempo-reparo-iv'
  | 'dto'
  | 'visao-geral'
  | 'cadastro'
  | 'documentos'
  | 'evidencias'
  | 'checklists';

export type StratifiedProblemCriticality = 'IMEDIATA' | 'ALTA' | 'MÉDIA';

export type StratifiedProblemEquipment =
  | 'Caminhão'
  | 'Cavalo Mecânico'
  | 'Empilhadeira';

export type StratifiedProblemCostCenter = 'Entrega' | 'Puxada' | 'Armazém';

export type StratifiedProblemMoment = 'Saída' | 'Retorno';

export type StratifiedProblemCategory = 'Segurança' | 'Qualidade';

export type StratifiedMonthShort =
  | 'JAN'
  | 'FEV'
  | 'MAR'
  | 'ABR'
  | 'MAI'
  | 'JUN'
  | 'JUL'
  | 'AGO'
  | 'SET'
  | 'OUT'
  | 'NOV'
  | 'DEZ';

export interface StratifiedProblemRecord {
  id: string;
  sourceKind: 'blitz' | 'mensal' | 'manual' | 'seed';
  sourceLabel: string;
  isEditable: boolean;
  month: StratifiedMonthShort;
  date: string;
  plate: string;
  equipment: StratifiedProblemEquipment;
  costCenter: StratifiedProblemCostCenter;
  driverOrOperator: string;
  occurrenceType: string;
  itemName: string;
  category: StratifiedProblemCategory;
  criticality: StratifiedProblemCriticality;
  moment: StratifiedProblemMoment;
  resolutionDays: number;
  resolved: boolean;
  details: string;
}

export interface DashboardFilters {
  period: '12m' | '6m' | '30d' | 'all';
  company: 'Todas' | Company;
  sector: 'Todos' | Sector;
  category: 'Todos' | VehicleCategory;
  status: 'Todos' | VehicleStatus;
  search: string;
}
