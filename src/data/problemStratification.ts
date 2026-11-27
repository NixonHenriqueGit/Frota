import {
  ComplianceMonth,
  LegalizedDocumentRecord,
  ProblemAssetKind,
  ProblemCriticalityTier,
  ProblemResolutionStatus,
  ProblemSeverityLevel,
  StratifiedProblemRecord,
  Vehicle,
} from '../types/fleet';
import {
  BLITZ_CATALOG,
  parseBlitzRecord,
} from './blitzCatalog';
import { BLITZ_MONTHS, getCurrentComplianceMonth } from './blitzEntregaSeed';
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
import { CLUSTERIZACAO_BY_MODAL } from './clusterizacaoData';

export const STRATIFIED_PROBLEM_MIME = 'application/vnd.pb-stratified-problem+json';

export const OCCURRENCE_TYPE_OPTIONS = [
  'Vazamento de Óleo / Hidráulica',
  'Segurança Crítica (Freios / Cinto / Elétrica)',
  'Iluminação e Sinalização',
  'Pneus e Rodas',
  'Carroceria / Baú / Sider',
  'Cabine / Ergonomia / 5S',
  'Torre / Garfos / Equipamento de Manuseio',
  'Documentação / Identificação Visual',
] as const;

export interface ProblemCatalogPreset {
  id: string;
  itemName: string;
  occurrenceType: string;
  classification: 'SEGURANÇA' | 'QUALIDADE';
  severityLevel: ProblemSeverityLevel;
  defaultDetails: string;
}

export const PROBLEM_CATALOG_PRESETS: ProblemCatalogPreset[] = [
  {
    id: 'vazamento-oleo',
    itemName: 'Vazamento de óleo / sistema hidráulico',
    occurrenceType: 'Vazamento de Óleo / Hidráulica',
    classification: 'SEGURANÇA',
    severityLevel: 'BLOQUEIO IMEDIATO',
    defaultDetails:
      'Item crítico: vazamento de óleo no motor ou sistema hidráulico com risco operacional e ambiental.',
  },
  {
    id: 'freios-luz',
    itemName: 'Luz de freio / sistema de frenagem',
    occurrenceType: 'Segurança Crítica (Freios / Cinto / Elétrica)',
    classification: 'SEGURANÇA',
    severityLevel: 'BLOQUEIO IMEDIATO',
    defaultDetails:
      'Item crítico: falha elétrica ou mecânica comprometendo parada segura do veículo.',
  },
  {
    id: 'cinto-seguranca',
    itemName: 'Cinto de segurança / sensor de cinto',
    occurrenceType: 'Segurança Crítica (Freios / Cinto / Elétrica)',
    classification: 'SEGURANÇA',
    severityLevel: 'BLOQUEIO IMEDIATO',
    defaultDetails:
      'Item crítico: ausência, desgaste ou sensor inoperante impedindo operação segura.',
  },
  {
    id: 'pneus-critico',
    itemName: 'Pneu abaixo da linha de vida / rachadura',
    occurrenceType: 'Pneus e Rodas',
    classification: 'SEGURANÇA',
    severityLevel: 'BLOQUEIO IMEDIATO',
    defaultDetails:
      'Item crítico: desgaste severo abaixo da marca TWI ou avaria estrutural no pneu.',
  },
  {
    id: 'farol-queimado',
    itemName: 'Farol / seta ou sirene de ré inoperante',
    occurrenceType: 'Iluminação e Sinalização',
    classification: 'SEGURANÇA',
    severityLevel: 'BLOQUEIO IMEDIATO',
    defaultDetails:
      'Item crítico: falha na iluminação ou sinalização sonora obrigatória.',
  },
  {
    id: 'extintor-vencido',
    itemName: 'Extintor de incêndio despressurizado / vencido',
    occurrenceType: 'Segurança Crítica (Freios / Cinto / Elétrica)',
    classification: 'SEGURANÇA',
    severityLevel: 'GRAVE',
    defaultDetails:
      'Item crítico (Grave): equipamento de combate a incêndio vencido ou sem pressão.',
  },
  {
    id: 'danos-carroceria',
    itemName: 'Pequenos danos na carroceria / baú',
    occurrenceType: 'Carroceria / Baú / Sider',
    classification: 'QUALIDADE',
    severityLevel: 'LEVE',
    defaultDetails:
      'Questão menos crítica: amassado leve ou avaria superficial na carroceria sem risco à segurança.',
  },
  {
    id: 'parachoque-leve',
    itemName: 'Arranhões leves no para-choque ou carenagem',
    occurrenceType: 'Carroceria / Baú / Sider',
    classification: 'QUALIDADE',
    severityLevel: 'LEVE',
    defaultDetails:
      'Questão menos crítica: avaria estética leve sem comprometer fixação ou segurança.',
  },
  {
    id: '5s-cabine',
    itemName: '5S / higienização de cabine e bancos',
    occurrenceType: 'Cabine / Ergonomia / 5S',
    classification: 'QUALIDADE',
    severityLevel: 'MÉDIO',
    defaultDetails:
      'Questão menos crítica: sujeira aparente ou organização interna necessitando limpeza.',
  },
  {
    id: 'adesivo-visual',
    itemName: 'Código visual / pintura externa desgastada',
    occurrenceType: 'Documentação / Identificação Visual',
    classification: 'QUALIDADE',
    severityLevel: 'LEVE',
    defaultDetails:
      'Questão menos crítica: desgaste visual de identificação sem impedir leitura da placa.',
  },
];

export function severityToCriticalityTier(
  level: ProblemSeverityLevel
): ProblemCriticalityTier {
  return level === 'BLOQUEIO IMEDIATO' || level === 'GRAVE'
    ? 'CRÍTICO'
    : 'MENOS CRÍTICO';
}

export function normalizeSeverityLevel(raw: string): ProblemSeverityLevel {
  const upper = raw.toUpperCase();
  if (upper.includes('BLOQUEIO')) return 'BLOQUEIO IMEDIATO';
  if (upper.includes('GRAVE')) return 'GRAVE';
  if (upper.includes('MÉDIO') || upper.includes('MEDIO')) return 'MÉDIO';
  return 'LEVE';
}

export function inferAssetKind(
  plate: string,
  fallback: ProblemAssetKind,
  vehicles: Vehicle[]
): ProblemAssetKind {
  const norm = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const match = vehicles.find(
    (v) => v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === norm
  );
  if (match) {
    if (match.category === 'Empilhadeira' || match.sector === 'Armazém') {
      return 'Equipamento de Manuseio';
    }
    if (
      match.sector === 'Puxada' ||
      match.category === 'Tração Caminhão Trator' ||
      match.category === 'Carga Semi-Reboque'
    ) {
      return 'Veículo de Puxada';
    }
    return 'Veículo de Entrega';
  }
  if (norm.startsWith('EMP') || norm.startsWith('PAL')) {
    return 'Equipamento de Manuseio';
  }
  return fallback;
}

function mapBlitzZoneToOccurrenceType(
  zoneKey: string,
  itemLabel: string
): string {
  const lower = itemLabel.toLowerCase();
  if (lower.includes('vazamento') || lower.includes('óleo') || lower.includes('hidrául')) {
    return 'Vazamento de Óleo / Hidráulica';
  }
  if (lower.includes('pneu') || lower.includes('roda') || lower.includes('milimetragem')) {
    return 'Pneus e Rodas';
  }
  if (
    lower.includes('farol') ||
    lower.includes('pisca') ||
    lower.includes('luz') ||
    lower.includes('sirene') ||
    lower.includes('blue spot') ||
    lower.includes('led')
  ) {
    return 'Iluminação e Sinalização';
  }
  if (
    lower.includes('cinto') ||
    lower.includes('extintor') ||
    lower.includes('freio') ||
    lower.includes('fiação') ||
    lower.includes('bateria') ||
    lower.includes('glp') ||
    lower.includes('volante')
  ) {
    return 'Segurança Crítica (Freios / Cinto / Elétrica)';
  }
  if (lower.includes('torre') || lower.includes('garfo') || lower.includes('tara')) {
    return 'Torre / Garfos / Equipamento de Manuseio';
  }
  if (lower.includes('documento') || lower.includes('placa') || lower.includes('adesivo') || lower.includes('código')) {
    return 'Documentação / Identificação Visual';
  }
  if (zoneKey === 'bau' || zoneKey === 'traseira' || zoneKey === 'frente') {
    return 'Carroceria / Baú / Sider';
  }
  if (zoneKey === 'cabine') return 'Cabine / Ergonomia / 5S';
  if (zoneKey === 'pneus') return 'Pneus e Rodas';
  if (zoneKey === 'torre') return 'Torre / Garfos / Equipamento de Manuseio';
  if (zoneKey === 'sinalizacao') return 'Iluminação e Sinalização';
  return 'Segurança Crítica (Freios / Cinto / Elétrica)';
}

function mapCheckZoneToOccurrenceType(tipo: string, item: string): string {
  const lower = item.toLowerCase();
  const tipoUpper = tipo.toUpperCase();
  if (lower.includes('vazamento') || lower.includes('óleo')) {
    return 'Vazamento de Óleo / Hidráulica';
  }
  if (tipoUpper.includes('PNEU')) return 'Pneus e Rodas';
  if (
    lower.includes('farol') ||
    lower.includes('pisca') ||
    lower.includes('luz') ||
    lower.includes('vigia')
  ) {
    return 'Iluminação e Sinalização';
  }
  if (
    lower.includes('cinto') ||
    lower.includes('extintor') ||
    lower.includes('fiação') ||
    lower.includes('bateria') ||
    lower.includes('freio') ||
    lower.includes('volante')
  ) {
    return 'Segurança Crítica (Freios / Cinto / Elétrica)';
  }
  if (lower.includes('documento') || lower.includes('placa') || lower.includes('adesivo') || lower.includes('código')) {
    return 'Documentação / Identificação Visual';
  }
  if (tipoUpper.includes('BAÚ') || tipoUpper.includes('SIDER') || tipoUpper.includes('TRASEIRA') || tipoUpper.includes('FRONTAL') || tipoUpper.includes('PLATAFORMA')) {
    return 'Carroceria / Baú / Sider';
  }
  if (tipoUpper.includes('CABINE')) return 'Cabine / Ergonomia / 5S';
  return 'Segurança Crítica (Freios / Cinto / Elétrica)';
}

function stripItemPrefix(label: string): string {
  return label.replace(/^\d+\s*[-.]\s*/, '').trim();
}

function matchClusterizacaoForBlitzItem(
  modal: 'caminhoes' | 'puxada' | 'empilhadeira',
  rawLabel: string
): {
  classification: 'SEGURANÇA' | 'QUALIDADE';
  severityLevel: ProblemSeverityLevel;
  explanation: string;
} {
  const clean = stripItemPrefix(rawLabel).toLowerCase();
  const rules = CLUSTERIZACAO_BY_MODAL[modal];
  const exactOrPartial = rules.filter(
    (r) =>
      r.micro.toLowerCase().includes(clean) ||
      clean.includes(r.micro.toLowerCase())
  );
  if (exactOrPartial.length > 0) {
    // Pick highest criticality rule when multiple rules exist for a Blitz exception
    const order: Record<ProblemSeverityLevel, number> = {
      'BLOQUEIO IMEDIATO': 4,
      GRAVE: 3,
      MÉDIO: 2,
      LEVE: 1,
    };
    const sorted = [...exactOrPartial].sort(
      (a, b) => order[b.level] - order[a.level]
    );
    const chosen = sorted[0];
    return {
      classification: chosen.classification,
      severityLevel: chosen.level,
      explanation: chosen.explanation,
    };
  }

  if (
    clean.includes('vazamento') ||
    clean.includes('cinto') ||
    clean.includes('freio') ||
    clean.includes('farol') ||
    clean.includes('luz') ||
    clean.includes('pisca') ||
    clean.includes('fiação') ||
    clean.includes('extintor')
  ) {
    return {
      classification: 'SEGURANÇA',
      severityLevel: 'BLOQUEIO IMEDIATO',
      explanation: 'Falha em item crítico de segurança identificada em checklist digital.',
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
      classification: 'QUALIDADE',
      severityLevel: 'LEVE',
      explanation: 'Desvio visual ou organizacional classificado como menos crítico.',
    };
  }

  return {
    classification: 'SEGURANÇA',
    severityLevel: 'MÉDIO',
    explanation: 'Não conformidade registrada em checklist digital.',
  };
}

interface StoredStratifiedProblemPayload {
  id: string;
  month: ComplianceMonth;
  date: string;
  plate: string;
  assetKind: ProblemAssetKind;
  driverOrOperator: string;
  occurrenceType: string;
  itemName: string;
  classification: 'SEGURANÇA' | 'QUALIDADE';
  severityLevel: ProblemSeverityLevel;
  details: string;
  status: ProblemResolutionStatus;
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

export function parseStratifiedProblemRecord(
  rec: LegalizedDocumentRecord
): StratifiedProblemRecord | null {
  if (!rec.fileDataUrl || !rec.fileDataUrl.startsWith('data:')) return null;
  const commaIdx = rec.fileDataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = rec.fileDataUrl.slice(commaIdx + 1);
    const json = rec.fileDataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<StoredStratifiedProblemPayload>;
    if (!parsed.plate || !parsed.itemName) return null;

    const validMonth: ComplianceMonth =
      BLITZ_MONTHS.find((m) => m.month === parsed.month)?.month ??
      getCurrentComplianceMonth();
    const severityLevel: ProblemSeverityLevel =
      parsed.severityLevel === 'BLOQUEIO IMEDIATO' ||
      parsed.severityLevel === 'GRAVE' ||
      parsed.severityLevel === 'MÉDIO' ||
      parsed.severityLevel === 'LEVE'
        ? parsed.severityLevel
        : 'MÉDIO';
    const assetKind: ProblemAssetKind =
      parsed.assetKind === 'Equipamento de Manuseio' ||
      parsed.assetKind === 'Veículo de Puxada' ||
      parsed.assetKind === 'Veículo de Entrega'
        ? parsed.assetKind
        : 'Veículo de Entrega';
    const status: ProblemResolutionStatus =
      parsed.status === 'Resolvido' ||
      parsed.status === 'Em tratativa' ||
      parsed.status === 'Aberto'
        ? parsed.status
        : 'Aberto';

    return {
      id: rec.id,
      sourceLabel: 'Registro Digital 1.3.3.4',
      isEditable: true,
      month: validMonth,
      date: String(parsed.date || rec.referenceDate || ''),
      plate: String(parsed.plate).toUpperCase().trim(),
      assetKind,
      driverOrOperator: String(parsed.driverOrOperator || 'Não informado').trim() || 'Não informado',
      occurrenceType: String(parsed.occurrenceType || OCCURRENCE_TYPE_OPTIONS[0]),
      itemName: String(parsed.itemName),
      classification: parsed.classification === 'QUALIDADE' ? 'QUALIDADE' : 'SEGURANÇA',
      severityLevel,
      criticalityTier: severityToCriticalityTier(severityLevel),
      details: String(parsed.details || ''),
      status,
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
    assetKind: input.assetKind,
    driverOrOperator: input.driverOrOperator.trim() || 'Não informado',
    occurrenceType: input.occurrenceType,
    itemName: input.itemName.trim(),
    classification: input.classification,
    severityLevel: input.severityLevel,
    details: input.details.trim(),
    status: input.status,
  };

  const serialized = serializeStratifiedProblem(payload);

  return {
    id: safeId,
    folder: 'ESTRATIFICAÇÃO PROBLEMAS',
    subfolder: '',
    fileName: `PROB_${payload.plate}_${payload.month}`,
    fileType: STRATIFIED_PROBLEM_MIME,
    fileSize: serialized.length,
    plate: payload.plate.slice(0, 20),
    expiryDate: payload.month,
    referenceDate: payload.date.slice(0, 40),
    notes: `${payload.severityLevel} · ${payload.occurrenceType} · ${payload.driverOrOperator}`.slice(
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
}

export function collectStratifiedProblems({
  vehicles,
  blitzEntregaDocs,
  blitzPuxadaDocs,
  blitzEmpilhadeiraDocs,
  caminhoesDocs,
  puxadaCheckDocs,
  estratificacaoDocs,
}: CollectStratifiedProblemsParams): StratifiedProblemRecord[] {
  const result: StratifiedProblemRecord[] = [];

  // 1. Custom Digital Records saved directly in 1.3.3.4
  for (const rec of estratificacaoDocs) {
    const parsed = parseStratifiedProblemRecord(rec);
    if (parsed) {
      result.push(parsed);
    }
  }

  // 2. Blitz de Entrega NOK items
  for (const rec of blitzEntregaDocs) {
    const payload = parseBlitzRecord(
      BLITZ_CATALOG.entrega,
      rec.fileDataUrl,
      rec.id
    );
    if (!payload) continue;
    const assetKind = inferAssetKind(payload.placa, 'Veículo de Entrega', vehicles);
    const driver = payload.nome.trim() || payload.criador.trim() || 'Não informado';
    for (const def of BLITZ_CATALOG.entrega.items) {
      if (payload.items[def.id] !== 'NOK') continue;
      const matched = matchClusterizacaoForBlitzItem('caminhoes', def.label);
      result.push({
        id: `b-ent-${payload.id}-${def.id}`,
        sourceLabel: 'Blitz de Entrega',
        isEditable: false,
        month: payload.mes,
        date: payload.data || rec.referenceDate,
        plate: payload.placa,
        assetKind,
        driverOrOperator: driver,
        occurrenceType: mapBlitzZoneToOccurrenceType(def.zone, def.label),
        itemName: stripItemPrefix(def.label),
        classification: matched.classification,
        severityLevel: matched.severityLevel,
        criticalityTier: severityToCriticalityTier(matched.severityLevel),
        details: matched.explanation,
        status: 'Aberto',
      });
    }
  }

  // 3. Blitz de Puxada NOK items
  for (const rec of blitzPuxadaDocs) {
    const payload = parseBlitzRecord(
      BLITZ_CATALOG.puxada,
      rec.fileDataUrl,
      rec.id
    );
    if (!payload) continue;
    const assetKind = inferAssetKind(payload.placa, 'Veículo de Puxada', vehicles);
    const driver = payload.nome.trim() || payload.criador.trim() || 'Não informado';
    for (const def of BLITZ_CATALOG.puxada.items) {
      if (payload.items[def.id] !== 'NOK') continue;
      const matched = matchClusterizacaoForBlitzItem('puxada', def.label);
      result.push({
        id: `b-pux-${payload.id}-${def.id}`,
        sourceLabel: 'Blitz de Puxada',
        isEditable: false,
        month: payload.mes,
        date: payload.data || rec.referenceDate,
        plate: payload.placa,
        assetKind,
        driverOrOperator: driver,
        occurrenceType: mapBlitzZoneToOccurrenceType(def.zone, def.label),
        itemName: stripItemPrefix(def.label),
        classification: matched.classification,
        severityLevel: matched.severityLevel,
        criticalityTier: severityToCriticalityTier(matched.severityLevel),
        details: matched.explanation,
        status: 'Aberto',
      });
    }
  }

  // 4. Blitz Empilhadeira NOK items
  for (const rec of blitzEmpilhadeiraDocs) {
    const payload = parseBlitzRecord(
      BLITZ_CATALOG.empilhadeira,
      rec.fileDataUrl,
      rec.id
    );
    if (!payload) continue;
    const driver = payload.nome.trim() || payload.criador.trim() || 'Não informado';
    for (const def of BLITZ_CATALOG.empilhadeira.items) {
      if (payload.items[def.id] !== 'NOK') continue;
      const matched = matchClusterizacaoForBlitzItem('empilhadeira', def.label);
      result.push({
        id: `b-emp-${payload.id}-${def.id}`,
        sourceLabel: 'Blitz Empilhadeira',
        isEditable: false,
        month: payload.mes,
        date: payload.data || rec.referenceDate,
        plate: payload.placa,
        assetKind: 'Equipamento de Manuseio',
        driverOrOperator: driver,
        occurrenceType: mapBlitzZoneToOccurrenceType(def.zone, def.label),
        itemName: stripItemPrefix(def.label),
        classification: matched.classification,
        severityLevel: matched.severityLevel,
        criticalityTier: severityToCriticalityTier(matched.severityLevel),
        details: matched.explanation,
        status: 'Aberto',
      });
    }
  }

  // 5. Caminhões Mensal NOK items (falls back to seed if DB has none yet)
  const resolvedCaminhoes =
    caminhoesDocs.length > 0
      ? caminhoesDocs
          .map((d) => parseCaminhoesRecord(d.fileDataUrl, d.id))
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : CAMINHOES_SEED_ROWS;

  for (const row of resolvedCaminhoes) {
    const assetKind = inferAssetKind(row.placa, 'Veículo de Entrega', vehicles);
    const driver = row.responsavel.trim() || 'Não informado';
    for (const col of CAMINHOES_COLUMNS) {
      if (row.items[col.id] !== 'NOK') continue;
      const severityLevel = normalizeSeverityLevel(col.gravidade);
      result.push({
        id: `cm-${row.id}-${col.id}`,
        sourceLabel: 'Check Caminhões',
        isEditable: false,
        month: row.mes,
        date: row.data,
        plate: row.placa,
        assetKind,
        driverOrOperator: driver,
        occurrenceType: mapCheckZoneToOccurrenceType(col.tipo, col.item),
        itemName: col.item,
        classification: col.classificacao.includes('QUALIDADE') && !col.classificacao.includes('SEGURANÇA')
          ? 'QUALIDADE'
          : 'SEGURANÇA',
        severityLevel,
        criticalityTier: severityToCriticalityTier(severityLevel),
        details: `${col.tipo} · ${col.classificacao} (${col.gravidade})`,
        status: 'Aberto',
      });
    }
  }

  // 6. Puxada Mensal NOK items (falls back to seed if DB has none yet)
  const resolvedPuxada =
    puxadaCheckDocs.length > 0
      ? puxadaCheckDocs
          .map((d) => parsePuxadaRecord(d.fileDataUrl, d.id))
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : PUXADA_SEED_ROWS;

  for (const row of resolvedPuxada) {
    const assetKind = inferAssetKind(row.placa, 'Veículo de Puxada', vehicles);
    const driver = row.responsavel.trim() || 'Não informado';
    for (const col of PUXADA_COLUMNS) {
      if (row.items[col.id] !== 'NOK') continue;
      const severityLevel = normalizeSeverityLevel(col.gravidade);
      result.push({
        id: `px-${row.id}-${col.id}`,
        sourceLabel: 'Check Puxada',
        isEditable: false,
        month: row.mes,
        date: row.data,
        plate: row.placa,
        assetKind,
        driverOrOperator: driver,
        occurrenceType: mapCheckZoneToOccurrenceType(col.tipo, col.item),
        itemName: col.item,
        classification: col.classificacao.includes('QUALIDADE') && !col.classificacao.includes('SEGURANÇA')
          ? 'QUALIDADE'
          : 'SEGURANÇA',
        severityLevel,
        criticalityTier: severityToCriticalityTier(severityLevel),
        details: `${col.tipo} · ${col.classificacao} (${col.gravidade})`,
        status: 'Aberto',
      });
    }
  }

  return result;
}
