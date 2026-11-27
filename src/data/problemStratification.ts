import {
  ComplianceMonth,
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  StratifiedProblemCategory,
  StratifiedProblemCostCenter,
  StratifiedProblemCriticality,
  StratifiedProblemEquipment,
  StratifiedProblemMoment,
  StratifiedProblemRecord,
  Vehicle,
} from '../types/fleet';
import { BLITZ_CATALOG, parseBlitzRecord } from './blitzCatalog';
import {
  CAMINHOES_COLUMNS,
  CAMINHOES_SEED_ROWS,
  parseCaminhoesRecord,
} from './caminhoesCheckSeed';
import {
  PUXADA_COLUMNS,
  PUXADA_SEED_ROWS,
  parsePuxadaRecord,
} from './puxadaCheckSeed';
import {
  CLUSTERIZACAO_BY_MODAL,
  ClusterizacaoLevel,
  ClusterizacaoModalKey,
} from './clusterizacaoData';

export const STRATIFIED_PROBLEM_MIME = 'application/vnd.pb-stratified-problem+json';
export const STRATIFIED_RESOLUTION_MIME =
  'application/vnd.pb-stratified-resolution+json';

export const STRATIFIED_MONTHS: StratifiedMonthShort[] = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

export const COMPLIANCE_MONTH_TO_SHORT: Record<
  ComplianceMonth,
  StratifiedMonthShort
> = {
  JANEIRO: 'JAN',
  FEVEREIRO: 'FEV',
  MARÇO: 'MAR',
  ABRIL: 'ABR',
  MAIO: 'MAI',
  JUNHO: 'JUN',
  JULHO: 'JUL',
  AGOSTO: 'AGO',
  SETEMBRO: 'SET',
  OUTUBRO: 'OUT',
  NOVEMBRO: 'NOV',
  DEZEMBRO: 'DEZ',
};

export const OCCURRENCE_TYPE_OPTIONS = [
  'Iluminação',
  'Estepe',
  'Buzina/Sirene',
  'Arrefecimento',
  'Alças laterais',
  'Veltec',
  'Extintor',
  'Limpador',
  'Pneus',
  'Carroceria / Baú',
  'Cinto / Segurança',
  'Outros',
] as const;

export const EQUIPMENT_TO_COST_CENTER: Record<
  StratifiedProblemEquipment,
  StratifiedProblemCostCenter
> = {
  Caminhão: 'Entrega',
  'Cavalo Mecânico': 'Puxada',
  Empilhadeira: 'Armazém',
};

export function inferEquipmentFromPlate(
  plate: string,
  vehicles: Vehicle[],
  fallback: StratifiedProblemEquipment = 'Caminhão'
): StratifiedProblemEquipment {
  const norm = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const match = vehicles.find(
    (v) => v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === norm
  );
  if (match) {
    if (match.category === 'Empilhadeira' || match.sector === 'Armazém') {
      return 'Empilhadeira';
    }
    if (
      match.sector === 'Puxada' ||
      match.category === 'Tração Caminhão Trator' ||
      match.category === 'Carga Semi-Reboque'
    ) {
      return 'Cavalo Mecânico';
    }
    return 'Caminhão';
  }
  if (norm.startsWith('EMP') || norm.startsWith('PAL')) return 'Empilhadeira';
  if (
    norm === 'RLT5J44' ||
    norm === 'RLT5J54' ||
    norm === 'MOM7962' ||
    norm === 'OFH7150' ||
    norm === 'NPT1753'
  ) {
    return 'Cavalo Mecânico';
  }
  return fallback;
}

export function getCurrentShortMonth(): StratifiedMonthShort {
  const idx = new Date().getMonth();
  return STRATIFIED_MONTHS[idx] ?? 'AGO';
}

function stripItemPrefix(label: string): string {
  return label.replace(/^\d+\s*[-.]\s*/, '').trim();
}

function mapLabelToOccurrenceType(label: string): string {
  const lower = label.toLowerCase();
  if (
    lower.includes('farol') ||
    lower.includes('pisca') ||
    lower.includes('luz') ||
    lower.includes('vigia') ||
    lower.includes('blue spot') ||
    lower.includes('led') ||
    lower.includes('ilumina')
  ) {
    return 'Iluminação';
  }
  if (lower.includes('estepe') || lower.includes('step')) {
    return 'Estepe';
  }
  if (
    lower.includes('buzina') ||
    lower.includes('sirene') ||
    lower.includes('sonoro')
  ) {
    return 'Buzina/Sirene';
  }
  if (
    lower.includes('arrefec') ||
    lower.includes('radiador') ||
    lower.includes('vazamento')
  ) {
    return 'Arrefecimento';
  }
  if (
    lower.includes('alça') ||
    lower.includes('apoio') ||
    lower.includes('estribo') ||
    lower.includes('puxador')
  ) {
    return 'Alças laterais';
  }
  if (
    lower.includes('veltec') ||
    lower.includes('tacógrafo') ||
    lower.includes('cronotac') ||
    lower.includes('velocidade')
  ) {
    return 'Veltec';
  }
  if (lower.includes('extintor')) {
    return 'Extintor';
  }
  if (
    lower.includes('limpador') ||
    lower.includes('lavador') ||
    lower.includes('para-brisa')
  ) {
    return 'Limpador';
  }
  if (
    lower.includes('pneu') ||
    lower.includes('milimetragem') ||
    lower.includes('roda')
  ) {
    return 'Pneus';
  }
  if (lower.includes('cinto') || lower.includes('sensor')) {
    return 'Cinto / Segurança';
  }
  if (
    lower.includes('baú') ||
    lower.includes('bau') ||
    lower.includes('baia') ||
    lower.includes('sider') ||
    lower.includes('lona') ||
    lower.includes('plataforma') ||
    lower.includes('carroceria') ||
    lower.includes('para-choque')
  ) {
    return 'Carroceria / Baú';
  }
  return 'Outros';
}

function mapGravidadeToCriticality(raw: string): StratifiedProblemCriticality {
  const upper = raw.toUpperCase();
  if (upper.includes('BLOQUEIO')) return 'IMEDIATA';
  if (upper.includes('GRAVE')) return 'ALTA';
  return 'MÉDIA';
}

function matchClusterizacao(
  modal: ClusterizacaoModalKey,
  rawLabel: string
): {
  category: StratifiedProblemCategory;
  criticality: StratifiedProblemCriticality;
  explanation: string;
} {
  const clean = stripItemPrefix(rawLabel).toLowerCase();
  const rules = CLUSTERIZACAO_BY_MODAL[modal];
  const matches = rules.filter(
    (r) =>
      r.micro.toLowerCase().includes(clean) ||
      clean.includes(r.micro.toLowerCase())
  );

  if (matches.length > 0) {
    const order: Record<ClusterizacaoLevel, number> = {
      'BLOQUEIO IMEDIATO': 4,
      GRAVE: 3,
      MÉDIO: 2,
      LEVE: 1,
    };
    const chosen = [...matches].sort(
      (a, b) => order[b.level] - order[a.level]
    )[0];
    return {
      category: chosen.classification === 'QUALIDADE' ? 'Qualidade' : 'Segurança',
      criticality: mapGravidadeToCriticality(chosen.level),
      explanation: chosen.explanation,
    };
  }

  if (
    clean.includes('5s') ||
    clean.includes('visual') ||
    clean.includes('forro') ||
    clean.includes('para-choque') ||
    clean.includes('adesivo') ||
    clean.includes('código')
  ) {
    return {
      category: 'Qualidade',
      criticality: 'MÉDIA',
      explanation: 'Desvio visual/organizacional identificado no checklist.',
    };
  }

  return {
    category: 'Segurança',
    criticality: 'IMEDIATA',
    explanation: 'Não conformidade crítica identificada no checklist.',
  };
}

function computeElapsedDaysSinceDate(dateStr: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
  if (!m) return 1;
  const parsed = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (Number.isNaN(parsed.getTime())) return 1;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round(
    (today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, Math.min(30, diff));
}

// Deterministic 47-record historical dataset matching reference analytics
function buildSeedDataset(): StratifiedProblemRecord[] {
  const monthsPool: StratifiedMonthShort[] = [
    ...Array<StratifiedMonthShort>(4).fill('JAN'),
    ...Array<StratifiedMonthShort>(2).fill('FEV'),
    ...Array<StratifiedMonthShort>(4).fill('MAR'),
    ...Array<StratifiedMonthShort>(5).fill('ABR'),
    ...Array<StratifiedMonthShort>(8).fill('MAI'),
    ...Array<StratifiedMonthShort>(9).fill('JUN'),
    ...Array<StratifiedMonthShort>(10).fill('JUL'),
    ...Array<StratifiedMonthShort>(5).fill('AGO'),
  ];

  const assetPool: Array<{
    plate: string;
    equipment: StratifiedProblemEquipment;
    costCenter: StratifiedProblemCostCenter;
  }> = [
    ...Array(7).fill({
      plate: 'RLT5J44',
      equipment: 'Cavalo Mecânico',
      costCenter: 'Puxada',
    }),
    ...Array(6).fill({
      plate: 'RLU3F59',
      equipment: 'Caminhão',
      costCenter: 'Entrega',
    }),
    ...Array(6).fill({
      plate: 'RLU4H49',
      equipment: 'Caminhão',
      costCenter: 'Entrega',
    }),
    ...Array(5).fill({
      plate: 'OXO0532',
      equipment: 'Caminhão',
      costCenter: 'Entrega',
    }),
    ...Array(5).fill({
      plate: 'RLT5J54',
      equipment: 'Cavalo Mecânico',
      costCenter: 'Puxada',
    }),
    ...Array(3).fill({
      plate: 'RLR8G79',
      equipment: 'Caminhão',
      costCenter: 'Entrega',
    }),
    ...Array(2).fill({
      plate: 'OXO0552',
      equipment: 'Caminhão',
      costCenter: 'Entrega',
    }),
    ...Array(2).fill({
      plate: 'RLW0C17',
      equipment: 'Caminhão',
      costCenter: 'Entrega',
    }),
    { plate: 'NPR2601', equipment: 'Caminhão', costCenter: 'Entrega' },
    { plate: 'OXO0542', equipment: 'Caminhão', costCenter: 'Entrega' },
    { plate: 'SLB3J76', equipment: 'Caminhão', costCenter: 'Entrega' },
    { plate: 'MOM7962', equipment: 'Cavalo Mecânico', costCenter: 'Puxada' },
    { plate: 'OFH7150', equipment: 'Cavalo Mecânico', costCenter: 'Puxada' },
    { plate: 'NPT1753', equipment: 'Cavalo Mecânico', costCenter: 'Puxada' },
    { plate: 'QFC6277', equipment: 'Cavalo Mecânico', costCenter: 'Puxada' },
    { plate: 'QFB4891', equipment: 'Cavalo Mecânico', costCenter: 'Puxada' },
    { plate: 'EMP0001', equipment: 'Empilhadeira', costCenter: 'Armazém' },
    { plate: 'EMP0004', equipment: 'Empilhadeira', costCenter: 'Armazém' },
    { plate: 'EMP0008', equipment: 'Empilhadeira', costCenter: 'Armazém' },
  ];

  const assetOrdered: typeof assetPool = [];
  const used = new Set<number>();
  let cursor = 0;
  for (let i = 0; i < 47; i++) {
    while (used.has(cursor)) cursor = (cursor + 1) % 47;
    used.add(cursor);
    assetOrdered.push(assetPool[cursor]);
    cursor = (cursor + 7) % 47;
  }

  const driversPool: string[] = [
    ...Array<string>(9).fill('Jefferson Jones'),
    ...Array<string>(7).fill('Lucas'),
    ...Array<string>(4).fill('Adelson'),
    ...Array<string>(4).fill('Manoel Messias'),
    ...Array<string>(3).fill('Ewerton Rodrigues'),
    ...Array<string>(3).fill('Manoel Alves'),
    ...Array<string>(2).fill('Lucas Gomes'),
    ...Array<string>(2).fill('José Eduardo'),
    'Carlos Henrique',
    'Rafael Lima',
    'Marcos Vinícius',
    'Anderson Silva',
    'Diego Santos',
    'Fábio Oliveira',
    'Thiago Costa',
    'Rodrigo Ferreira',
    'Bruno Nascimento',
    'Cláudio Pereira',
    'Renato Almeida',
    'Leandro Barbosa',
    'Welington Souza',
  ];

  const driverOrdered: string[] = [];
  const usedDrivers = new Set<number>();
  let dCursor = 3;
  for (let i = 0; i < 47; i++) {
    while (usedDrivers.has(dCursor)) dCursor = (dCursor + 1) % 47;
    usedDrivers.add(dCursor);
    driverOrdered.push(driversPool[dCursor]);
    dCursor = (dCursor + 5) % 47;
  }

  const occurrencePool: string[] = [
    ...Array<string>(14).fill('Iluminação'),
    ...Array<string>(8).fill('Estepe'),
    ...Array<string>(7).fill('Buzina/Sirene'),
    ...Array<string>(3).fill('Arrefecimento'),
    ...Array<string>(3).fill('Alças laterais'),
    ...Array<string>(3).fill('Outros'),
    ...Array<string>(3).fill('Veltec'),
    ...Array<string>(3).fill('Extintor'),
    ...Array<string>(2).fill('Limpador'),
    'Pneus',
  ];

  const occOrdered: string[] = [];
  const usedOcc = new Set<number>();
  let oCursor = 1;
  for (let i = 0; i < 47; i++) {
    while (usedOcc.has(oCursor)) oCursor = (oCursor + 1) % 47;
    usedOcc.add(oCursor);
    occOrdered.push(occurrencePool[oCursor]);
    oCursor = (oCursor + 11) % 47;
  }

  const critPool: StratifiedProblemCriticality[] = [
    ...Array<StratifiedProblemCriticality>(31).fill('IMEDIATA'),
    ...Array<StratifiedProblemCriticality>(12).fill('ALTA'),
    ...Array<StratifiedProblemCriticality>(4).fill('MÉDIA'),
  ];
  const critOrdered: StratifiedProblemCriticality[] = [];
  const usedCrit = new Set<number>();
  let cCursor = 2;
  for (let i = 0; i < 47; i++) {
    while (usedCrit.has(cCursor)) cCursor = (cCursor + 1) % 47;
    usedCrit.add(cCursor);
    critOrdered.push(critPool[cCursor]);
    cCursor = (cCursor + 9) % 47;
  }

  const momentPool: StratifiedProblemMoment[] = [
    ...Array<StratifiedProblemMoment>(40).fill('Saída'),
    ...Array<StratifiedProblemMoment>(7).fill('Retorno'),
  ];
  const momentOrdered: StratifiedProblemMoment[] = [];
  const usedMoment = new Set<number>();
  let mCursor = 0;
  for (let i = 0; i < 47; i++) {
    while (usedMoment.has(mCursor)) mCursor = (mCursor + 1) % 47;
    usedMoment.add(mCursor);
    momentOrdered.push(momentPool[mCursor]);
    mCursor = (mCursor + 13) % 47;
  }

  const categoryPool: StratifiedProblemCategory[] = [
    ...Array<StratifiedProblemCategory>(41).fill('Segurança'),
    ...Array<StratifiedProblemCategory>(6).fill('Qualidade'),
  ];
  const categoryOrdered: StratifiedProblemCategory[] = [];
  const usedCat = new Set<number>();
  let catCursor = 4;
  for (let i = 0; i < 47; i++) {
    while (usedCat.has(catCursor)) catCursor = (catCursor + 1) % 47;
    usedCat.add(catCursor);
    categoryOrdered.push(categoryPool[catCursor]);
    catCursor = (catCursor + 10) % 47;
  }

  const daysPool: number[] = [
    ...Array<number>(15).fill(0),
    ...Array<number>(25).fill(1),
    2,
    ...Array<number>(4).fill(3),
    ...Array<number>(2).fill(4),
  ];
  const daysOrdered: number[] = [];
  const usedDays = new Set<number>();
  let dayCursor = 1;
  for (let i = 0; i < 47; i++) {
    while (usedDays.has(dayCursor)) dayCursor = (dayCursor + 1) % 47;
    usedDays.add(dayCursor);
    daysOrdered.push(daysPool[dayCursor]);
    dayCursor = (dayCursor + 6) % 47;
  }

  const monthNum: Record<StratifiedMonthShort, string> = {
    JAN: '01',
    FEV: '02',
    MAR: '03',
    ABR: '04',
    MAI: '05',
    JUN: '06',
    JUL: '07',
    AGO: '08',
    SET: '09',
    OUT: '10',
    NOV: '11',
    DEZ: '12',
  };

  return monthsPool.map((month, idx) => {
    const day = String(((idx * 3) % 26) + 2).padStart(2, '0');
    const occType = occOrdered[idx];
    const moment = momentOrdered[idx];
    return {
      id: `seed-ep-${String(idx + 1).padStart(2, '0')}`,
      sourceKind: 'seed',
      sourceLabel: 'Histórico Base',
      isEditable: false,
      month,
      date: `${day}/${monthNum[month]}/2026`,
      plate: assetOrdered[idx].plate,
      equipment: assetOrdered[idx].equipment,
      costCenter: assetOrdered[idx].costCenter,
      driverOrOperator: driverOrdered[idx],
      occurrenceType: occType,
      itemName: occType,
      category: categoryOrdered[idx],
      criticality: critOrdered[idx],
      moment,
      resolutionDays: daysOrdered[idx],
      resolved: true,
      details: `Ocorrência de ${occType} identificada na ${moment.toLowerCase()} · Criticidade ${critOrdered[idx]}.`,
    };
  });
}

export const STRATIFIED_PROBLEM_SEED: StratifiedProblemRecord[] = buildSeedDataset();

interface StoredStratifiedProblemPayload {
  id: string;
  month: StratifiedMonthShort;
  date: string;
  plate: string;
  equipment: StratifiedProblemEquipment;
  costCenter: StratifiedProblemCostCenter;
  driverOrOperator: string;
  occurrenceType: string;
  itemName?: string;
  category: StratifiedProblemCategory;
  criticality: StratifiedProblemCriticality;
  moment: StratifiedProblemMoment;
  resolutionDays: number;
  resolved?: boolean;
  details: string;
}

export interface StratifiedResolutionOverridePayload {
  targetId: string;
  resolved: boolean;
  resolutionDays: number;
  moment?: StratifiedProblemMoment;
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeUtf8Base64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function serializeStratifiedProblem(
  payload: StoredStratifiedProblemPayload
): string {
  return `data:${STRATIFIED_PROBLEM_MIME};base64,${encodeUtf8Base64(
    JSON.stringify(payload)
  )}`;
}

export function buildStratifiedResolutionRecord(
  input: StratifiedResolutionOverridePayload,
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const cleanTargetSlug = input.targetId
    .replace(/[^A-Z0-9-]/gi, '')
    .toLowerCase()
    .slice(0, 48);
  const safeId = `ep-res-${cleanTargetSlug}`;
  const json = JSON.stringify({
    targetId: input.targetId,
    resolved: input.resolved,
    resolutionDays: Math.max(0, Number(input.resolutionDays) || 0),
    moment: input.moment,
  });
  const serialized = `data:${STRATIFIED_RESOLUTION_MIME};base64,${encodeUtf8Base64(json)}`;

  return {
    id: safeId,
    folder: 'ESTRATIFICAÇÃO PROBLEMAS',
    subfolder: '',
    fileName: `RES_${cleanTargetSlug}`,
    fileType: STRATIFIED_RESOLUTION_MIME,
    fileSize: serialized.length,
    plate: 'RESOLUCAO',
    expiryDate: input.resolved ? 'RESOLVIDO' : 'ABERTO',
    referenceDate: nowDate,
    notes: `${input.resolved ? 'Resolvido' : 'Em aberto'} (${input.resolutionDays} d)`,
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

export function parseStratifiedResolutionOverride(
  rec: LegalizedDocumentRecord
): StratifiedResolutionOverridePayload | null {
  if (!rec.fileDataUrl || !rec.fileDataUrl.includes(STRATIFIED_RESOLUTION_MIME)) {
    return null;
  }
  const commaIdx = rec.fileDataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = rec.fileDataUrl.slice(commaIdx + 1);
    const json = rec.fileDataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<StratifiedResolutionOverridePayload>;
    if (!parsed.targetId) return null;
    return {
      targetId: String(parsed.targetId),
      resolved: Boolean(parsed.resolved),
      resolutionDays:
        typeof parsed.resolutionDays === 'number' && Number.isFinite(parsed.resolutionDays)
          ? Math.max(0, parsed.resolutionDays)
          : 1,
      moment:
        parsed.moment === 'Retorno' || parsed.moment === 'Saída'
          ? parsed.moment
          : undefined,
    };
  } catch {
    return null;
  }
}

export function parseStratifiedProblemRecord(
  rec: LegalizedDocumentRecord
): StratifiedProblemRecord | null {
  if (!rec.fileDataUrl || !rec.fileDataUrl.startsWith('data:')) return null;
  if (rec.fileDataUrl.includes(STRATIFIED_RESOLUTION_MIME)) return null;
  if (rec.fileDataUrl.includes('pb-quality-iv')) return null;
  const commaIdx = rec.fileDataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = rec.fileDataUrl.slice(commaIdx + 1);
    const json = rec.fileDataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<StoredStratifiedProblemPayload>;
    if (!parsed.plate || !parsed.occurrenceType) return null;

    const validMonth: StratifiedMonthShort = STRATIFIED_MONTHS.includes(
      parsed.month as StratifiedMonthShort
    )
      ? (parsed.month as StratifiedMonthShort)
      : getCurrentShortMonth();

    const equipment: StratifiedProblemEquipment =
      parsed.equipment === 'Cavalo Mecânico' ||
      parsed.equipment === 'Empilhadeira' ||
      parsed.equipment === 'Caminhão'
        ? parsed.equipment
        : 'Caminhão';

    const costCenter: StratifiedProblemCostCenter =
      parsed.costCenter === 'Puxada' ||
      parsed.costCenter === 'Armazém' ||
      parsed.costCenter === 'Entrega'
        ? parsed.costCenter
        : EQUIPMENT_TO_COST_CENTER[equipment];

    const criticality: StratifiedProblemCriticality =
      parsed.criticality === 'IMEDIATA' ||
      parsed.criticality === 'ALTA' ||
      parsed.criticality === 'MÉDIA'
        ? parsed.criticality
        : 'IMEDIATA';

    const moment: StratifiedProblemMoment =
      parsed.moment === 'Retorno' ? 'Retorno' : 'Saída';

    const category: StratifiedProblemCategory =
      parsed.category === 'Qualidade' ? 'Qualidade' : 'Segurança';

    const resolutionDays =
      typeof parsed.resolutionDays === 'number' && Number.isFinite(parsed.resolutionDays)
        ? Math.max(0, parsed.resolutionDays)
        : 1;

    return {
      id: rec.id,
      sourceKind: 'manual',
      sourceLabel: 'Registro Manual',
      isEditable: true,
      month: validMonth,
      date: String(parsed.date || rec.referenceDate || ''),
      plate: String(parsed.plate).toUpperCase().trim(),
      equipment,
      costCenter,
      driverOrOperator:
        String(parsed.driverOrOperator || 'Não informado').trim() || 'Não informado',
      occurrenceType: String(parsed.occurrenceType),
      itemName: String(parsed.itemName || parsed.occurrenceType),
      category,
      criticality,
      moment,
      resolutionDays,
      resolved: parsed.resolved ?? true,
      details: String(parsed.details || ''),
    };
  } catch {
    return null;
  }
}

export function buildStratifiedProblemRecord(
  input: Omit<StoredStratifiedProblemPayload, 'id'> & { id?: string },
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const plateSlug =
    input.plate.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'item';
  const safeId =
    input.id && input.id.startsWith('ep-')
      ? input.id
      : `ep-${plateSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

  const payload: StoredStratifiedProblemPayload = {
    id: safeId,
    month: input.month,
    date: input.date || nowDate,
    plate: input.plate.toUpperCase().trim(),
    equipment: input.equipment,
    costCenter: input.costCenter,
    driverOrOperator: input.driverOrOperator.trim() || 'Não informado',
    occurrenceType: input.occurrenceType,
    itemName: (input.itemName || input.occurrenceType).trim(),
    category: input.category,
    criticality: input.criticality,
    moment: input.moment,
    resolutionDays: Math.max(0, Number(input.resolutionDays) || 0),
    resolved: input.resolved ?? true,
    details: input.details.trim(),
  };

  const serialized = serializeStratifiedProblem(payload);

  return {
    id: safeId,
    folder: 'ESTRATIFICAÇÃO PROBLEMAS',
    subfolder: '',
    fileName: `OCORR_${payload.plate}_${payload.month}`,
    fileType: STRATIFIED_PROBLEM_MIME,
    fileSize: serialized.length,
    plate: payload.plate.slice(0, 20),
    expiryDate: payload.month,
    referenceDate: payload.date.slice(0, 40),
    notes: `${payload.criticality} · ${payload.occurrenceType} · ${payload.driverOrOperator}`.slice(
      0,
      500
    ),
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

export interface CollectStratifiedProblemsParams {
  vehicles: Vehicle[];
  blitzEntregaDocs: LegalizedDocumentRecord[];
  blitzPuxadaDocs: LegalizedDocumentRecord[];
  blitzEmpilhadeiraDocs: LegalizedDocumentRecord[];
  caminhoesDocs: LegalizedDocumentRecord[];
  puxadaCheckDocs: LegalizedDocumentRecord[];
  estratificacaoDocs: LegalizedDocumentRecord[];
  includeHistoricalBase?: boolean;
}

export function collectStratifiedProblems({
  vehicles,
  blitzEntregaDocs,
  blitzPuxadaDocs,
  blitzEmpilhadeiraDocs,
  caminhoesDocs,
  puxadaCheckDocs,
  estratificacaoDocs,
  includeHistoricalBase = true,
}: CollectStratifiedProblemsParams): StratifiedProblemRecord[] {
  const overrideMap = new Map<string, StratifiedResolutionOverridePayload>();
  const customRecords: StratifiedProblemRecord[] = [];

  for (const rec of estratificacaoDocs) {
    const ov = parseStratifiedResolutionOverride(rec);
    if (ov) {
      overrideMap.set(ov.targetId, ov);
      continue;
    }
    const parsed = parseStratifiedProblemRecord(rec);
    if (parsed) {
      customRecords.push(parsed);
    }
  }

  const applyOverride = (rec: StratifiedProblemRecord): StratifiedProblemRecord => {
    const ov = overrideMap.get(rec.id);
    if (!ov) return rec;
    return {
      ...rec,
      resolved: ov.resolved,
      resolutionDays: ov.resolutionDays,
      moment: ov.moment ?? rec.moment,
    };
  };

  const liveChecks: StratifiedProblemRecord[] = [];

  // 1. Blitz de Entrega NOKs
  for (const rec of blitzEntregaDocs) {
    const payload = parseBlitzRecord(
      BLITZ_CATALOG.entrega,
      rec.fileDataUrl,
      rec.id
    );
    if (!payload) continue;
    const equipment = inferEquipmentFromPlate(payload.placa, vehicles, 'Caminhão');
    const costCenter = EQUIPMENT_TO_COST_CENTER[equipment];
    const driver =
      payload.nome.trim() || payload.criador.trim() || 'Não informado';
    const monthShort = COMPLIANCE_MONTH_TO_SHORT[payload.mes] ?? 'JAN';
    const baseDate = payload.data || rec.referenceDate || '';
    const defaultDays = computeElapsedDaysSinceDate(baseDate);

    for (const def of BLITZ_CATALOG.entrega.items) {
      if (payload.items[def.id] !== 'NOK') continue;
      const itemLabel = stripItemPrefix(def.label);
      const cls = matchClusterizacao('caminhoes', def.label);
      liveChecks.push(
        applyOverride({
          id: `b-ent-${payload.id}-${def.id}`,
          sourceKind: 'blitz',
          sourceLabel: 'Blitz Entrega',
          isEditable: false,
          month: monthShort,
          date: baseDate,
          plate: payload.placa,
          equipment,
          costCenter,
          driverOrOperator: driver,
          occurrenceType: mapLabelToOccurrenceType(itemLabel),
          itemName: itemLabel,
          category: cls.category,
          criticality: cls.criticality,
          moment: payload.momento === 'Retorno' ? 'Retorno' : 'Saída',
          resolutionDays: defaultDays,
          resolved: false,
          details: cls.explanation,
        })
      );
    }
  }

  // 2. Blitz de Puxada NOKs
  for (const rec of blitzPuxadaDocs) {
    const payload = parseBlitzRecord(
      BLITZ_CATALOG.puxada,
      rec.fileDataUrl,
      rec.id
    );
    if (!payload) continue;
    const equipment = inferEquipmentFromPlate(
      payload.placa,
      vehicles,
      'Cavalo Mecânico'
    );
    const costCenter = EQUIPMENT_TO_COST_CENTER[equipment];
    const driver =
      payload.nome.trim() || payload.criador.trim() || 'Não informado';
    const monthShort = COMPLIANCE_MONTH_TO_SHORT[payload.mes] ?? 'JAN';
    const baseDate = payload.data || rec.referenceDate || '';
    const defaultDays = computeElapsedDaysSinceDate(baseDate);

    for (const def of BLITZ_CATALOG.puxada.items) {
      if (payload.items[def.id] !== 'NOK') continue;
      const itemLabel = stripItemPrefix(def.label);
      const cls = matchClusterizacao('puxada', def.label);
      liveChecks.push(
        applyOverride({
          id: `b-pux-${payload.id}-${def.id}`,
          sourceKind: 'blitz',
          sourceLabel: 'Blitz Puxada',
          isEditable: false,
          month: monthShort,
          date: baseDate,
          plate: payload.placa,
          equipment,
          costCenter,
          driverOrOperator: driver,
          occurrenceType: mapLabelToOccurrenceType(itemLabel),
          itemName: itemLabel,
          category: cls.category,
          criticality: cls.criticality,
          moment: payload.momento === 'Retorno' ? 'Retorno' : 'Saída',
          resolutionDays: defaultDays,
          resolved: false,
          details: cls.explanation,
        })
      );
    }
  }

  // 3. Blitz Empilhadeira NOKs
  for (const rec of blitzEmpilhadeiraDocs) {
    const payload = parseBlitzRecord(
      BLITZ_CATALOG.empilhadeira,
      rec.fileDataUrl,
      rec.id
    );
    if (!payload) continue;
    const driver =
      payload.nome.trim() || payload.criador.trim() || 'Não informado';
    const monthShort = COMPLIANCE_MONTH_TO_SHORT[payload.mes] ?? 'JAN';
    const baseDate = payload.data || rec.referenceDate || '';
    const defaultDays = computeElapsedDaysSinceDate(baseDate);

    for (const def of BLITZ_CATALOG.empilhadeira.items) {
      if (payload.items[def.id] !== 'NOK') continue;
      const itemLabel = stripItemPrefix(def.label);
      const cls = matchClusterizacao('empilhadeira', def.label);
      liveChecks.push(
        applyOverride({
          id: `b-emp-${payload.id}-${def.id}`,
          sourceKind: 'blitz',
          sourceLabel: 'Blitz Empilhadeira',
          isEditable: false,
          month: monthShort,
          date: baseDate,
          plate: payload.placa,
          equipment: 'Empilhadeira',
          costCenter: 'Armazém',
          driverOrOperator: driver,
          occurrenceType: mapLabelToOccurrenceType(itemLabel),
          itemName: itemLabel,
          category: cls.category,
          criticality: cls.criticality,
          moment: payload.momento === 'Retorno' ? 'Retorno' : 'Saída',
          resolutionDays: defaultDays,
          resolved: false,
          details: cls.explanation,
        })
      );
    }
  }

  // 4. Check Mensal Caminhões NOKs
  const resolvedCaminhoes =
    caminhoesDocs.length > 0
      ? caminhoesDocs
          .map((d) => parseCaminhoesRecord(d.fileDataUrl, d.id))
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : CAMINHOES_SEED_ROWS;

  for (const row of resolvedCaminhoes) {
    const equipment = inferEquipmentFromPlate(row.placa, vehicles, 'Caminhão');
    const costCenter = EQUIPMENT_TO_COST_CENTER[equipment];
    const driver = row.responsavel.trim() || 'Não informado';
    const monthShort = COMPLIANCE_MONTH_TO_SHORT[row.mes] ?? 'JAN';
    const defaultDays = computeElapsedDaysSinceDate(row.data);

    for (const col of CAMINHOES_COLUMNS) {
      if (row.items[col.id] !== 'NOK') continue;
      const category: StratifiedProblemCategory =
        col.classificacao.includes('QUALIDADE') &&
        !col.classificacao.includes('SEGURANÇA')
          ? 'Qualidade'
          : 'Segurança';
      liveChecks.push(
        applyOverride({
          id: `cm-${row.id}-${col.id}`,
          sourceKind: 'mensal',
          sourceLabel: 'Check Caminhões',
          isEditable: false,
          month: monthShort,
          date: row.data,
          plate: row.placa,
          equipment,
          costCenter,
          driverOrOperator: driver,
          occurrenceType: mapLabelToOccurrenceType(col.item),
          itemName: col.item,
          category,
          criticality: mapGravidadeToCriticality(col.gravidade),
          moment: row.momento === 'Retorno' ? 'Retorno' : 'Saída',
          resolutionDays: defaultDays,
          resolved: false,
          details: `${col.tipo} · ${col.classificacao} (${col.gravidade})`,
        })
      );
    }
  }

  // 5. Check Mensal Puxada NOKs
  const resolvedPuxada =
    puxadaCheckDocs.length > 0
      ? puxadaCheckDocs
          .map((d) => parsePuxadaRecord(d.fileDataUrl, d.id))
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : PUXADA_SEED_ROWS;

  for (const row of resolvedPuxada) {
    const equipment = inferEquipmentFromPlate(
      row.placa,
      vehicles,
      'Cavalo Mecânico'
    );
    const costCenter = EQUIPMENT_TO_COST_CENTER[equipment];
    const driver = row.responsavel.trim() || 'Não informado';
    const monthShort = COMPLIANCE_MONTH_TO_SHORT[row.mes] ?? 'JAN';
    const defaultDays = computeElapsedDaysSinceDate(row.data);

    for (const col of PUXADA_COLUMNS) {
      if (row.items[col.id] !== 'NOK') continue;
      const category: StratifiedProblemCategory =
        col.classificacao.includes('QUALIDADE') &&
        !col.classificacao.includes('SEGURANÇA')
          ? 'Qualidade'
          : 'Segurança';
      liveChecks.push(
        applyOverride({
          id: `px-${row.id}-${col.id}`,
          sourceKind: 'mensal',
          sourceLabel: 'Check Puxada',
          isEditable: false,
          month: monthShort,
          date: row.data,
          plate: row.placa,
          equipment,
          costCenter,
          driverOrOperator: driver,
          occurrenceType: mapLabelToOccurrenceType(col.item),
          itemName: col.item,
          category,
          criticality: mapGravidadeToCriticality(col.gravidade),
          moment: row.momento === 'Retorno' ? 'Retorno' : 'Saída',
          resolutionDays: defaultDays,
          resolved: false,
          details: `${col.tipo} · ${col.classificacao} (${col.gravidade})`,
        })
      );
    }
  }

  if (includeHistoricalBase) {
    return [...liveChecks, ...customRecords, ...STRATIFIED_PROBLEM_SEED];
  }
  return [...liveChecks, ...customRecords];
}
