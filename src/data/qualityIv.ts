import {
  BlitzItemStatus,
  ComplianceCheckRecord,
  ComplianceMonth,
  LegalizedDocumentRecord,
  SafetyCheckMonthKey,
  StratifiedMonthShort,
  Vehicle,
  VisualStandardScope,
} from '../types/fleet';
import { BLITZ_CATALOG, parseBlitzRecord } from './blitzCatalog';
import {
  CAMINHOES_COLUMNS,
  CAMINHOES_SEED_ROWS,
  parseCaminhoesRecord,
} from './caminhoesCheckSeed';
import { CHECKLIST_ITEMS } from './fleetSeed';
import {
  COMPLIANCE_MONTH_TO_SHORT,
  STRATIFIED_MONTHS,
  collectStratifiedProblems,
} from './problemStratification';
import {
  PUXADA_COLUMNS,
  PUXADA_SEED_ROWS,
  parsePuxadaRecord,
} from './puxadaCheckSeed';
import {
  SAFETY_CHECK_SEED_ROWS,
  SAFETY_MONTH_COLUMNS,
  parseSafetyCheckRow,
} from './safetyCheckSeed';
import { VISUAL_STANDARD_DECKS, parseVisualValidation } from './visualStandardsSeed';

export const QUALITY_IV_MIME = 'application/vnd.pb-quality-iv+json';
export const QUALITY_IV_CONFIG_ID = 'ep-iv-config';

export type QualityChecklistFamilyId =
  | 'blitz-entrega'
  | 'blitz-puxada'
  | 'blitz-empilhadeira'
  | 'check-caminhoes'
  | 'check-puxada'
  | 'check-seguranca-ytd'
  | 'padroes-visuais'
  | 'check-documental'
  | 'frota-15-itens';

export type QualityGrade = 'Excelente' | 'Adequado' | 'Atenção' | 'Crítico';

export interface QualityAuditExecutionRow {
  id: string;
  familyId: QualityChecklistFamilyId;
  familyLabel: string;
  operation: 'Entrega' | 'Puxada' | 'Armazém' | 'Frota Geral';
  month: StratifiedMonthShort | 'GERAL';
  date: string;
  plate: string;
  responsible: string;
  driverOrOperator: string;
  moment: 'Saída' | 'Retorno' | 'Mensal' | 'Cadastro';
  totalItems: number;
  answeredItems: number;
  okCount: number;
  nokCount: number;
  naCount: number;
  conformityPct: number;
  traceabilityPct: number;
  rigorPct: number;
  qualityIvPct: number;
  grade: QualityGrade;
  flags: string[];
  crossCheckDiffPp?: number;
}

export interface QualityFamilySummary {
  familyId: QualityChecklistFamilyId;
  label: string;
  shortLabel: string;
  operation: string;
  executionsCount: number;
  uniqueAssetsCount: number;
  avgConformityPct: number;
  avgTraceabilityPct: number;
  avgRigorPct: number;
  ivScorePct: number;
  nokTotal: number;
  flaggedCount: number;
}

export interface QualityMonthlyPoint {
  month: StratifiedMonthShort;
  safetyKey: SafetyCheckMonthKey;
  executionsCount: number;
  ivPct: number | null;
  conformityPct: number | null;
  traceabilityPct: number | null;
  rigorPct: number | null;
  nokResolutionPct: number | null;
}

export interface QualityCrossCheckPair {
  plate: string;
  month: StratifiedMonthShort;
  blitzLabel: string;
  blitzPct: number;
  mensalLabel: string;
  mensalPct: number;
  diffPp: number;
  consistent: boolean;
}

export interface QualityIvConfig {
  targetIvPct: number;
  auditorName: string;
  auditNotes: string;
  updatedAt: string;
}

export const DEFAULT_QUALITY_IV_CONFIG: QualityIvConfig = {
  targetIvPct: 90,
  auditorName: 'Gestão Frota PB',
  auditNotes:
    'Monitoramento contínuo do Indicador de Valor (IV) sobre preenchimento, cobertura, rigor e tratativa de não conformidades.',
  updatedAt: new Date().toLocaleDateString('pt-BR'),
};

export interface QualityGradeSlice {
  grade: QualityGrade;
  count: number;
  pct: number;
}

export interface QualityOperationSummary {
  operation: 'Entrega' | 'Puxada' | 'Armazém' | 'Frota Geral';
  executionsCount: number;
  ivPct: number;
  conformityPct: number;
  traceabilityPct: number;
  rigorPct: number;
  flaggedCount: number;
}

export interface QualityMomentSlice {
  moment: 'Saída' | 'Retorno' | 'Mensal' | 'Cadastro';
  count: number;
  pct: number;
  ivPct: number;
}

export interface QualityFlagParetoItem {
  flag: string;
  count: number;
  pct: number;
}

export interface QualityPlateRankItem {
  plate: string;
  operation: string;
  executionsCount: number;
  avgIvPct: number;
  avgConformityPct: number;
  flaggedCount: number;
  nokTotal: number;
}

export interface QualityPersonRankItem {
  name: string;
  count: number;
  avgIvPct: number;
  avgConformityPct: number;
  avgTraceabilityPct: number;
  nokTotal: number;
  flaggedCount: number;
}

export interface QualityHeatmapRow {
  familyId: QualityChecklistFamilyId;
  shortLabel: string;
  cells: Array<{
    month: StratifiedMonthShort;
    ivPct: number | null;
    count: number;
  }>;
}

export interface ComputeQualityIvInput {
  vehicles: Vehicle[];
  complianceChecks: ComplianceCheckRecord[];
  safetyCheckDocs: LegalizedDocumentRecord[];
  visualStandardDocs: LegalizedDocumentRecord[];
  blitzEntregaDocs: LegalizedDocumentRecord[];
  blitzPuxadaDocs: LegalizedDocumentRecord[];
  blitzEmpilhadeiraDocs: LegalizedDocumentRecord[];
  caminhoesDocs: LegalizedDocumentRecord[];
  puxadaCheckDocs: LegalizedDocumentRecord[];
  estratificacaoDocs: LegalizedDocumentRecord[];
  selectedMonth?: StratifiedMonthShort | 'ALL';
  selectedFamily?: QualityChecklistFamilyId | 'ALL';
  selectedOperation?: 'Entrega' | 'Puxada' | 'Armazém' | 'Frota Geral' | 'ALL';
  selectedGrade?: QualityGrade | 'ALL';
  selectedPlate?: string | 'ALL';
}

export interface QualityIvAnalysis {
  ivScorePct: number;
  grade: QualityGrade;
  pillars: {
    coberturaPct: number;
    rastreabilidadePct: number;
    rigorPct: number;
    conformidadePct: number;
    tratativaPct: number;
  };
  totals: {
    totalExecutions: number;
    activeFleetCount: number;
    coveredAssetsCount: number;
    totalItemsChecked: number;
    totalNoks: number;
    resolvedNoks: number;
    resolvedIn1DayPct: number;
    flaggedExecutionsCount: number;
    cleanExecutionsPct: number;
    crossCheckCount: number;
    crossCheckConsistentCount: number;
  };
  answerComposition: {
    okTotal: number;
    nokTotal: number;
    naTotal: number;
    unansweredTotal: number;
    totalSlots: number;
  };
  gradeDistribution: QualityGradeSlice[];
  operationBreakdown: QualityOperationSummary[];
  momentBreakdown: QualityMomentSlice[];
  flagPareto: QualityFlagParetoItem[];
  plateRankingBottom: QualityPlateRankItem[];
  plateRankingTop: QualityPlateRankItem[];
  inspectorRanking: QualityPersonRankItem[];
  driverRanking: QualityPersonRankItem[];
  heatmapMonths: StratifiedMonthShort[];
  heatmapRows: QualityHeatmapRow[];
  families: QualityFamilySummary[];
  monthlySeries: QualityMonthlyPoint[];
  crossChecks: QualityCrossCheckPair[];
  executions: QualityAuditExecutionRow[];
}

const SAFETY_KEY_TO_SHORT: Record<SafetyCheckMonthKey, StratifiedMonthShort> = {
  jan: 'JAN',
  fev: 'FEV',
  mar: 'MAR',
  abr: 'ABR',
  mai: 'MAI',
  jun: 'JUN',
  jul: 'JUL',
  ago: 'AGO',
  set: 'SET',
  out: 'OUT',
  nov: 'NOV',
  dez: 'DEZ',
};

function normPlate(plate: string): string {
  return plate.replace(/[^A-Z0-9]/gi, '').toUpperCase().trim();
}

function classifyGrade(score: number): QualityGrade {
  if (score >= 90) return 'Excelente';
  if (score >= 78) return 'Adequado';
  if (score >= 62) return 'Atenção';
  return 'Crítico';
}

function isPlaceholderName(name: string): boolean {
  const clean = name.trim().toLowerCase();
  return (
    !clean ||
    clean === 'não informado' ||
    clean === 'nao informado' ||
    clean === 'n/i' ||
    clean === '-' ||
    clean.length < 2
  );
}

function isValidBrDate(dateStr: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim());
}

function monthFromBrDate(dateStr: string): StratifiedMonthShort | null {
  const m = /^\d{2}\/(\d{2})\/\d{4}$/.exec(dateStr.trim());
  if (!m) return null;
  const idx = Number(m[1]) - 1;
  return STRATIFIED_MONTHS[idx] ?? null;
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

export function parseQualityIvConfig(
  estratificacaoDocs: LegalizedDocumentRecord[]
): QualityIvConfig {
  const doc = estratificacaoDocs.find(
    (d) =>
      d.id === QUALITY_IV_CONFIG_ID ||
      (d.fileDataUrl && d.fileDataUrl.includes(QUALITY_IV_MIME))
  );
  if (!doc || !doc.fileDataUrl) return DEFAULT_QUALITY_IV_CONFIG;
  const commaIdx = doc.fileDataUrl.indexOf(',');
  if (commaIdx === -1) return DEFAULT_QUALITY_IV_CONFIG;
  try {
    const raw = doc.fileDataUrl.slice(commaIdx + 1);
    const json = doc.fileDataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<QualityIvConfig>;
    return {
      targetIvPct:
        typeof parsed.targetIvPct === 'number' && Number.isFinite(parsed.targetIvPct)
          ? Math.max(50, Math.min(100, Math.round(parsed.targetIvPct)))
          : DEFAULT_QUALITY_IV_CONFIG.targetIvPct,
      auditorName:
        typeof parsed.auditorName === 'string' && parsed.auditorName.trim()
          ? parsed.auditorName.trim()
          : DEFAULT_QUALITY_IV_CONFIG.auditorName,
      auditNotes:
        typeof parsed.auditNotes === 'string'
          ? parsed.auditNotes
          : DEFAULT_QUALITY_IV_CONFIG.auditNotes,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt
          ? parsed.updatedAt
          : doc.uploadedAt || DEFAULT_QUALITY_IV_CONFIG.updatedAt,
    };
  } catch {
    return DEFAULT_QUALITY_IV_CONFIG;
  }
}

export function buildQualityIvConfigRecord(
  config: QualityIvConfig
): LegalizedDocumentRecord {
  const nowDate = new Date().toLocaleDateString('pt-BR');
  const payload: QualityIvConfig = {
    targetIvPct: Math.max(50, Math.min(100, Math.round(config.targetIvPct))),
    auditorName: config.auditorName.trim() || DEFAULT_QUALITY_IV_CONFIG.auditorName,
    auditNotes: config.auditNotes.trim(),
    updatedAt: nowDate,
  };
  const serialized = `data:${QUALITY_IV_MIME};base64,${encodeUtf8Base64(
    JSON.stringify(payload)
  )}`;
  return {
    id: QUALITY_IV_CONFIG_ID,
    folder: 'ESTRATIFICAÇÃO PROBLEMAS',
    subfolder: '',
    fileName: 'CONFIG_QUALIDADE_IV',
    fileType: QUALITY_IV_MIME,
    fileSize: serialized.length,
    plate: 'META_IV',
    expiryDate: `${payload.targetIvPct}%`,
    referenceDate: nowDate,
    notes: `Meta IV: ${payload.targetIvPct}% · Auditor: ${payload.auditorName}`.slice(
      0,
      500
    ),
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, n) => acc + n, 0) / nums.length;
}

export function computeQualityIvAnalysis({
  vehicles,
  complianceChecks,
  safetyCheckDocs,
  visualStandardDocs,
  blitzEntregaDocs,
  blitzPuxadaDocs,
  blitzEmpilhadeiraDocs,
  caminhoesDocs,
  puxadaCheckDocs,
  estratificacaoDocs,
  selectedMonth = 'ALL',
  selectedFamily = 'ALL',
  selectedOperation = 'ALL',
  selectedGrade = 'ALL',
  selectedPlate = 'ALL',
}: ComputeQualityIvInput): QualityIvAnalysis {
  const allExecutions: QualityAuditExecutionRow[] = [];

  // Map blitz & mensal conformity by (plate + month) for cross-check rigor auditing
  const blitzByPlateMonth = new Map<
    string,
    { label: string; pct: number; plate: string; month: StratifiedMonthShort }
  >();
  const mensalByPlateMonth = new Map<
    string,
    { label: string; pct: number; plate: string; month: StratifiedMonthShort }
  >();

  // 1. Blitz (Entrega, Puxada, Empilhadeira)
  const blitzBundles: Array<{
    kind: 'entrega' | 'puxada' | 'empilhadeira';
    familyId: QualityChecklistFamilyId;
    familyLabel: string;
    operation: 'Entrega' | 'Puxada' | 'Armazém';
    docs: LegalizedDocumentRecord[];
  }> = [
    {
      kind: 'entrega',
      familyId: 'blitz-entrega',
      familyLabel: '1.2.3.2 Blitz de Entrega',
      operation: 'Entrega',
      docs: blitzEntregaDocs,
    },
    {
      kind: 'puxada',
      familyId: 'blitz-puxada',
      familyLabel: '1.2.3.3 Blitz de Puxada',
      operation: 'Puxada',
      docs: blitzPuxadaDocs,
    },
    {
      kind: 'empilhadeira',
      familyId: 'blitz-empilhadeira',
      familyLabel: '1.2.3.4 Blitz Empilhadeira',
      operation: 'Armazém',
      docs: blitzEmpilhadeiraDocs,
    },
  ];

  for (const bundle of blitzBundles) {
    const config = BLITZ_CATALOG[bundle.kind];
    for (const rec of bundle.docs) {
      const payload = parseBlitzRecord(config, rec.fileDataUrl, rec.id);
      if (!payload) continue;

      const totalItems = config.items.length;
      let okCount = 0;
      let nokCount = 0;
      let naCount = 0;
      for (const item of config.items) {
        const st: BlitzItemStatus | undefined = payload.items[item.id];
        if (st === 'OK') okCount += 1;
        else if (st === 'NOK') nokCount += 1;
        else if (st === 'NA') naCount += 1;
      }
      const answeredItems = okCount + nokCount + naCount;
      const applicable = okCount + nokCount;
      const conformityPct =
        applicable > 0 ? Math.round((okCount / applicable) * 100) : payload.percentual;

      const flags: string[] = [];
      let traceScore = 100;

      if (isPlaceholderName(payload.criador)) {
        traceScore -= 25;
        flags.push('Inspetor/Criador ausente');
      }
      if (isPlaceholderName(payload.nome)) {
        traceScore -= 25;
        flags.push('Motorista/Operador ausente');
      }
      if (!isValidBrDate(payload.data)) {
        traceScore -= 15;
        flags.push('Data inválida/ausente');
      }
      if (config.hasMapa && !payload.mapa.trim()) {
        traceScore -= 10;
        flags.push('Mapa sem preenchimento');
      }
      if (!payload.cpf.trim()) {
        traceScore -= 10;
        flags.push('CPF não informado');
      }
      const completionRatio = totalItems > 0 ? answeredItems / totalItems : 1;
      if (completionRatio < 0.9) {
        traceScore -= 20;
        flags.push(`Check incompleto (${answeredItems}/${totalItems} itens)`);
      }

      let rigorScore = 100;
      const naRatio = totalItems > 0 ? naCount / totalItems : 0;
      if (naRatio > 0.35) {
        rigorScore -= 25;
        flags.push(`Excesso de N/A (${Math.round(naRatio * 100)}%)`);
      }
      if (
        conformityPct === 100 &&
        (isPlaceholderName(payload.nome) || isPlaceholderName(payload.criador))
      ) {
        rigorScore -= 20;
        flags.push('100% OK sem rastreio completo');
      }
      if (applicable === 0) {
        rigorScore -= 40;
        flags.push('Nenhum item aplicável avaliado');
      }

      const monthShort = COMPLIANCE_MONTH_TO_SHORT[payload.mes] ?? 'JAN';
      const plateKey = `${normPlate(payload.placa)}|${monthShort}`;
      blitzByPlateMonth.set(plateKey, {
        label: bundle.familyLabel,
        pct: conformityPct,
        plate: normPlate(payload.placa),
        month: monthShort,
      });

      const traceabilityPct = Math.max(0, Math.min(100, traceScore));
      const rigorPct = Math.max(0, Math.min(100, rigorScore));
      const qualityIvPct = Math.round(
        conformityPct * 0.35 + traceabilityPct * 0.35 + rigorPct * 0.3
      );

      allExecutions.push({
        id: `q-${bundle.familyId}-${payload.id}`,
        familyId: bundle.familyId,
        familyLabel: bundle.familyLabel,
        operation: bundle.operation,
        month: monthShort,
        date: payload.data || rec.referenceDate || '',
        plate: normPlate(payload.placa),
        responsible: payload.criador.trim() || 'Não informado',
        driverOrOperator: payload.nome.trim() || 'Não informado',
        moment: payload.momento === 'Retorno' ? 'Retorno' : 'Saída',
        totalItems,
        answeredItems,
        okCount,
        nokCount,
        naCount,
        conformityPct,
        traceabilityPct,
        rigorPct,
        qualityIvPct,
        grade: classifyGrade(qualityIvPct),
        flags,
      });
    }
  }

  // 2. Check Mensal Caminhões (86 itens)
  const resolvedCaminhoes =
    caminhoesDocs.length > 0
      ? caminhoesDocs
          .map((d) => parseCaminhoesRecord(d.fileDataUrl, d.id))
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : CAMINHOES_SEED_ROWS;

  for (const row of resolvedCaminhoes) {
    const totalItems = CAMINHOES_COLUMNS.length;
    let okCount = 0;
    let nokCount = 0;
    let naCount = 0;
    for (const col of CAMINHOES_COLUMNS) {
      const st = row.items[col.id];
      if (st === 'OK') okCount += 1;
      else if (st === 'NOK') nokCount += 1;
      else if (st === 'NA') naCount += 1;
    }
    const answeredItems = okCount + nokCount + naCount;
    const applicable = okCount + nokCount;
    const conformityPct =
      applicable > 0 ? Math.round((okCount / applicable) * 100) : row.percentual;

    const flags: string[] = [];
    let traceScore = 100;
    if (isPlaceholderName(row.responsavel)) {
      traceScore -= 30;
      flags.push('Responsável não informado');
    }
    if (!isValidBrDate(row.data)) {
      traceScore -= 15;
      flags.push('Data inválida/ausente');
    }
    if (totalItems > 0 && answeredItems / totalItems < 0.9) {
      traceScore -= 25;
      flags.push(`Check parcial (${answeredItems}/${totalItems})`);
    }

    let rigorScore = 100;
    const naRatio = totalItems > 0 ? naCount / totalItems : 0;
    if (naRatio > 0.35) {
      rigorScore -= 20;
      flags.push(`Excesso de N/A (${Math.round(naRatio * 100)}%)`);
    }
    if (conformityPct === 100 && isPlaceholderName(row.responsavel)) {
      rigorScore -= 20;
      flags.push('100% OK sem responsável');
    }

    const monthShort = COMPLIANCE_MONTH_TO_SHORT[row.mes] ?? 'JAN';
    const plateKey = `${normPlate(row.placa)}|${monthShort}`;
    mensalByPlateMonth.set(plateKey, {
      label: '1.2.3.5 Check Caminhões',
      pct: conformityPct,
      plate: normPlate(row.placa),
      month: monthShort,
    });

    const traceabilityPct = Math.max(0, Math.min(100, traceScore));
    const rigorPct = Math.max(0, Math.min(100, rigorScore));
    const qualityIvPct = Math.round(
      conformityPct * 0.35 + traceabilityPct * 0.35 + rigorPct * 0.3
    );

    allExecutions.push({
      id: `q-cm-${row.id}`,
      familyId: 'check-caminhoes',
      familyLabel: '1.2.3.5 Check Caminhões',
      operation: 'Entrega',
      month: monthShort,
      date: row.data,
      plate: normPlate(row.placa),
      responsible: row.responsavel.trim() || 'Não informado',
      driverOrOperator: row.responsavel.trim() || 'Não informado',
      moment: row.momento === 'Retorno' ? 'Retorno' : 'Saída',
      totalItems,
      answeredItems,
      okCount,
      nokCount,
      naCount,
      conformityPct,
      traceabilityPct,
      rigorPct,
      qualityIvPct,
      grade: classifyGrade(qualityIvPct),
      flags,
    });
  }

  // 3. Check Mensal Puxada (73 itens)
  const resolvedPuxada =
    puxadaCheckDocs.length > 0
      ? puxadaCheckDocs
          .map((d) => parsePuxadaRecord(d.fileDataUrl, d.id))
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : PUXADA_SEED_ROWS;

  for (const row of resolvedPuxada) {
    const totalItems = PUXADA_COLUMNS.length;
    let okCount = 0;
    let nokCount = 0;
    let naCount = 0;
    for (const col of PUXADA_COLUMNS) {
      const st = row.items[col.id];
      if (st === 'OK') okCount += 1;
      else if (st === 'NOK') nokCount += 1;
      else if (st === 'NA') naCount += 1;
    }
    const answeredItems = okCount + nokCount + naCount;
    const applicable = okCount + nokCount;
    const conformityPct =
      applicable > 0 ? Math.round((okCount / applicable) * 100) : row.percentual;

    const flags: string[] = [];
    let traceScore = 100;
    if (isPlaceholderName(row.responsavel)) {
      traceScore -= 30;
      flags.push('Responsável não informado');
    }
    if (!isValidBrDate(row.data)) {
      traceScore -= 15;
      flags.push('Data inválida/ausente');
    }
    if (totalItems > 0 && answeredItems / totalItems < 0.9) {
      traceScore -= 25;
      flags.push(`Check parcial (${answeredItems}/${totalItems})`);
    }

    let rigorScore = 100;
    const naRatio = totalItems > 0 ? naCount / totalItems : 0;
    if (naRatio > 0.35) {
      rigorScore -= 20;
      flags.push(`Excesso de N/A (${Math.round(naRatio * 100)}%)`);
    }

    const monthShort = COMPLIANCE_MONTH_TO_SHORT[row.mes] ?? 'JAN';
    const plateKey = `${normPlate(row.placa)}|${monthShort}`;
    mensalByPlateMonth.set(plateKey, {
      label: '1.2.3.6 Check Puxada',
      pct: conformityPct,
      plate: normPlate(row.placa),
      month: monthShort,
    });

    const traceabilityPct = Math.max(0, Math.min(100, traceScore));
    const rigorPct = Math.max(0, Math.min(100, rigorScore));
    const qualityIvPct = Math.round(
      conformityPct * 0.35 + traceabilityPct * 0.35 + rigorPct * 0.3
    );

    allExecutions.push({
      id: `q-px-${row.id}`,
      familyId: 'check-puxada',
      familyLabel: '1.2.3.6 Check Puxada',
      operation: 'Puxada',
      month: monthShort,
      date: row.data,
      plate: normPlate(row.placa),
      responsible: row.responsavel.trim() || 'Não informado',
      driverOrOperator: row.responsavel.trim() || 'Não informado',
      moment: row.momento === 'Retorno' ? 'Retorno' : 'Saída',
      totalItems,
      answeredItems,
      okCount,
      nokCount,
      naCount,
      conformityPct,
      traceabilityPct,
      rigorPct,
      qualityIvPct,
      grade: classifyGrade(qualityIvPct),
      flags,
    });
  }

  // 4. Cross-check Blitz x Mensal consistency on same plate & month
  const crossChecks: QualityCrossCheckPair[] = [];
  for (const [key, blitz] of blitzByPlateMonth.entries()) {
    const mensal = mensalByPlateMonth.get(key);
    if (!mensal) continue;
    const diffPp = Math.abs(blitz.pct - mensal.pct);
    const consistent = diffPp <= 10;
    crossChecks.push({
      plate: blitz.plate,
      month: blitz.month,
      blitzLabel: blitz.label,
      blitzPct: blitz.pct,
      mensalLabel: mensal.label,
      mensalPct: mensal.pct,
      diffPp,
      consistent,
    });
    if (!consistent) {
      for (const exec of allExecutions) {
        if (
          exec.plate === blitz.plate &&
          exec.month === blitz.month &&
          (exec.familyId.startsWith('blitz-') || exec.familyId.startsWith('check-'))
        ) {
          exec.rigorPct = Math.max(40, exec.rigorPct - 20);
          exec.crossCheckDiffPp = diffPp;
          exec.flags.push(`Divergência Blitz × Mensal (${diffPp} p.p.)`);
          exec.qualityIvPct = Math.round(
            exec.conformityPct * 0.35 +
              exec.traceabilityPct * 0.35 +
              exec.rigorPct * 0.3
          );
          exec.grade = classifyGrade(exec.qualityIvPct);
        }
      }
    }
  }

  // 5. Check de Segurança YTD (1.2.3.1)
  const resolvedSafetyRows =
    safetyCheckDocs.length > 0
      ? safetyCheckDocs
          .map((d) =>
            parseSafetyCheckRow(d.fileDataUrl, {
              id: d.id,
              plate: d.plate,
              unit: d.referenceDate,
            })
          )
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : SAFETY_CHECK_SEED_ROWS;

  for (const row of resolvedSafetyRows) {
    const filledMonths = SAFETY_MONTH_COLUMNS.filter(
      (col) => typeof row.months[col.key] === 'number'
    );
    for (const col of filledMonths) {
      const pct = row.months[col.key] ?? 0;
      const monthShort = SAFETY_KEY_TO_SHORT[col.key];
      const op =
        row.operation === 'PUXADA'
          ? 'Puxada'
          : row.operation === 'ARMAZÉM'
            ? 'Armazém'
            : 'Entrega';

      const hasDetailedCheck =
        blitzByPlateMonth.has(`${normPlate(row.plate)}|${monthShort}`) ||
        mensalByPlateMonth.has(`${normPlate(row.plate)}|${monthShort}`);

      const flags: string[] = [];
      let rigorPct = 95;
      if (!hasDetailedCheck) {
        rigorPct = 82;
        flags.push('Sem check detalhado vinculado no mês');
      }

      const traceabilityPct = row.unit.trim() ? 95 : 75;
      const qualityIvPct = Math.round(
        pct * 0.4 + traceabilityPct * 0.3 + rigorPct * 0.3
      );

      allExecutions.push({
        id: `q-ytd-${row.id}-${col.key}`,
        familyId: 'check-seguranca-ytd',
        familyLabel: '1.2.3.1 Check Segurança YTD',
        operation: op,
        month: monthShort,
        date: `${col.label}/2026`,
        plate: normPlate(row.plate),
        responsible: row.unit || 'GUARABIRA',
        driverOrOperator: 'Consolidado YTD',
        moment: 'Mensal',
        totalItems: 1,
        answeredItems: 1,
        okCount: pct >= 95 ? 1 : 0,
        nokCount: pct < 95 ? 1 : 0,
        naCount: 0,
        conformityPct: pct,
        traceabilityPct,
        rigorPct,
        qualityIvPct,
        grade: classifyGrade(qualityIvPct),
        flags,
      });
    }
  }

  // 6. Padrões Visuais (1.2.2)
  for (const rec of visualStandardDocs) {
    const scope: VisualStandardScope =
      rec.fileType.includes('equip') || rec.id.startsWith('vp-equip')
        ? 'equipamentos'
        : 'frota';
    const parsed = parseVisualValidation(rec.fileDataUrl, scope);
    if (!parsed) continue;
    const deck = VISUAL_STANDARD_DECKS[scope];
    const totalItems = deck.items.length;
    let okCount = 0;
    let nokCount = 0;
    let naCount = 0;
    for (const item of deck.items) {
      const st = parsed.items[item.id]?.status;
      if (st === 'CONFORME') okCount += 1;
      else if (st === 'BLOQUEIO') nokCount += 1;
      else if (st === 'NA') naCount += 1;
    }
    const answeredItems = okCount + nokCount + naCount;
    const applicable = okCount + nokCount;
    const conformityPct =
      applicable > 0 ? Math.round((okCount / applicable) * 100) : 100;

    const flags: string[] = [];
    let traceScore = 100;
    if (isPlaceholderName(parsed.inspector)) {
      traceScore -= 30;
      flags.push('Inspetor visual não informado');
    }
    if (!parsed.assetLabel.trim()) {
      traceScore -= 25;
      flags.push('Ativo/Placa não informado');
    }
    if (!isValidBrDate(parsed.validatedAt)) {
      traceScore -= 15;
      flags.push('Data de validação ausente');
    }
    if (totalItems > 0 && answeredItems / totalItems < 0.85) {
      traceScore -= 20;
      flags.push(`Validação parcial (${answeredItems}/${totalItems})`);
    }

    let rigorScore = 100;
    if (applicable === 0) {
      rigorScore -= 35;
      flags.push('Itens sem avaliação Conforme/Bloqueio');
    }

    const monthShort = monthFromBrDate(parsed.validatedAt) ?? 'GERAL';
    const traceabilityPct = Math.max(0, Math.min(100, traceScore));
    const rigorPct = Math.max(0, Math.min(100, rigorScore));
    const qualityIvPct = Math.round(
      conformityPct * 0.35 + traceabilityPct * 0.35 + rigorPct * 0.3
    );

    allExecutions.push({
      id: `q-vis-${rec.id}`,
      familyId: 'padroes-visuais',
      familyLabel: '1.2.2 Padrões Visuais',
      operation: scope === 'equipamentos' ? 'Armazém' : 'Frota Geral',
      month: monthShort,
      date: parsed.validatedAt || rec.uploadedAt,
      plate: normPlate(parsed.assetLabel || rec.plate || 'ATIVO'),
      responsible: parsed.inspector || 'Não informado',
      driverOrOperator: parsed.modalType || 'Padrão Visual',
      moment: 'Mensal',
      totalItems,
      answeredItems,
      okCount,
      nokCount,
      naCount,
      conformityPct,
      traceabilityPct,
      rigorPct,
      qualityIvPct,
      grade: classifyGrade(qualityIvPct),
      flags,
    });
  }

  // 7. Check Documentação Fora de Conformidade (1.1.5)
  for (const cc of complianceChecks) {
    const statuses = [cc.crlvAno, cc.cronotacografo, cc.antt, cc.contratoLocacao];
    const okCount = statuses.filter((s) => s === 'OK').length;
    const nokCount = statuses.filter((s) => s === 'NOK').length;
    const naCount = statuses.filter((s) => s === 'N/A').length;
    const applicable = okCount + nokCount;
    const conformityPct =
      applicable > 0 ? Math.round((okCount / applicable) * 100) : 100;

    const flags: string[] = [];
    let traceScore = 100;
    if (!isValidBrDate(cc.checkDate)) {
      traceScore -= 20;
      flags.push('Data do check documental ausente');
    }
    if (!cc.unit.trim()) {
      traceScore -= 15;
      flags.push('Unidade não informada');
    }
    const rigorPct = naCount === 4 ? 50 : 96;
    if (naCount === 4) flags.push('Todos os documentos marcados como N/A');

    const monthShort =
      COMPLIANCE_MONTH_TO_SHORT[cc.month as ComplianceMonth] ?? 'JAN';
    const op = cc.operation === 'PUXADA' ? 'Puxada' : cc.operation === 'ENTREGA' ? 'Entrega' : 'Frota Geral';
    const qualityIvPct = Math.round(
      conformityPct * 0.35 + traceScore * 0.35 + rigorPct * 0.3
    );

    allExecutions.push({
      id: `q-doc-${cc.id}`,
      familyId: 'check-documental',
      familyLabel: '1.1.5 Check Documental',
      operation: op,
      month: monthShort,
      date: cc.checkDate,
      plate: normPlate(cc.plate),
      responsible: cc.unit || 'GUARABIRA',
      driverOrOperator: cc.operation,
      moment: 'Mensal',
      totalItems: 4,
      answeredItems: 4,
      okCount,
      nokCount,
      naCount,
      conformityPct,
      traceabilityPct: traceScore,
      rigorPct,
      qualityIvPct,
      grade: classifyGrade(qualityIvPct),
      flags,
    });
  }

  // 8. Checklists da Frota 15 itens (1.1.2)
  for (const v of vehicles) {
    const totalItems = CHECKLIST_ITEMS.length;
    let okCount = 0;
    for (const item of CHECKLIST_ITEMS) {
      if (v.checklist[item.key]) okCount += 1;
    }
    const nokCount = totalItems - okCount;
    const conformityPct = Math.round((okCount / totalItems) * 100);
    const flags: string[] = [];
    let traceScore = 100;
    if (!v.fleetNumber.trim()) {
      traceScore -= 15;
      flags.push('Número de frota não cadastrado');
    }
    if (!v.lastUpdated.trim()) {
      traceScore -= 10;
      flags.push('Data de atualização ausente');
    }
    if (okCount === 0) {
      traceScore -= 30;
      flags.push('Checklist 15 itens ainda não preenchido');
    }
    const rigorPct =
      okCount === 0
        ? 45
        : conformityPct === 100 && !v.fleetNumber.trim()
          ? 85
          : 95;
    const op =
      v.sector === 'Puxada'
        ? 'Puxada'
        : v.sector === 'Armazém'
          ? 'Armazém'
          : v.sector === 'Distribuição'
            ? 'Entrega'
            : 'Frota Geral';

    const qualityIvPct = Math.round(
      conformityPct * 0.35 + traceScore * 0.35 + rigorPct * 0.3
    );

    allExecutions.push({
      id: `q-v15-${v.id}`,
      familyId: 'frota-15-itens',
      familyLabel: '1.1.2 Checklist 15 Itens',
      operation: op,
      month: 'GERAL',
      date: v.lastUpdated || '',
      plate: normPlate(v.plate),
      responsible: v.company,
      driverOrOperator: v.model || v.category,
      moment: 'Cadastro',
      totalItems,
      answeredItems: okCount > 0 ? totalItems : 0,
      okCount,
      nokCount,
      naCount: 0,
      conformityPct,
      traceabilityPct: traceScore,
      rigorPct,
      qualityIvPct,
      grade: classifyGrade(qualityIvPct),
      flags,
    });
  }

  // Filter executions by active dashboard filters
  const filteredExecutions = allExecutions.filter((e) => {
    if (selectedMonth !== 'ALL' && e.month !== 'GERAL' && e.month !== selectedMonth) {
      return false;
    }
    if (selectedFamily !== 'ALL' && e.familyId !== selectedFamily) {
      return false;
    }
    if (selectedOperation !== 'ALL' && e.operation !== selectedOperation) {
      return false;
    }
    if (selectedGrade !== 'ALL' && e.grade !== selectedGrade) {
      return false;
    }
    if (selectedPlate !== 'ALL' && e.plate !== selectedPlate) {
      return false;
    }
    return true;
  });

  // NOK Resolution metrics from 1.3.3.4
  const stratifiedProblems = collectStratifiedProblems({
    vehicles,
    blitzEntregaDocs,
    blitzPuxadaDocs,
    blitzEmpilhadeiraDocs,
    caminhoesDocs,
    puxadaCheckDocs,
    estratificacaoDocs,
    includeHistoricalBase: true,
  }).filter((p) => (selectedMonth === 'ALL' ? true : p.month === selectedMonth));

  const totalProblemRecords = stratifiedProblems.length;
  const resolvedProblemsCount = stratifiedProblems.filter((p) => p.resolved).length;
  const resolvedIn1DayCount = stratifiedProblems.filter(
    (p) => p.resolved && p.resolutionDays <= 1
  ).length;
  const tratativaPct =
    totalProblemRecords > 0
      ? Math.round((resolvedProblemsCount / totalProblemRecords) * 100)
      : 100;
  const resolvedIn1DayPct =
    totalProblemRecords > 0
      ? Math.round((resolvedIn1DayCount / totalProblemRecords) * 100)
      : 100;

  // Coverage of active vehicles
  const activeVehicles = vehicles.filter((v) => v.status === 'Ativo');
  const activePlateSet = new Set(activeVehicles.map((v) => normPlate(v.plate)));
  const coveredPlateSet = new Set<string>();
  for (const e of filteredExecutions) {
    if (activePlateSet.has(e.plate)) {
      coveredPlateSet.add(e.plate);
    }
  }
  const coberturaPct =
    activePlateSet.size > 0
      ? Math.min(100, Math.round((coveredPlateSet.size / activePlateSet.size) * 100))
      : 100;

  const conformidadePct = Math.round(
    avg(filteredExecutions.map((e) => e.conformityPct))
  );
  const rastreabilidadePct = Math.round(
    avg(filteredExecutions.map((e) => e.traceabilityPct))
  );
  const rigorPct = Math.round(avg(filteredExecutions.map((e) => e.rigorPct)));

  const ivScorePct =
    filteredExecutions.length > 0
      ? Math.round(
          coberturaPct * 0.2 +
            rastreabilidadePct * 0.2 +
            rigorPct * 0.2 +
            conformidadePct * 0.2 +
            tratativaPct * 0.2
        )
      : 0;

  // Breakdown by Checklist Family (unfiltered by selectedFamily so user sees full scorecard, filtered by month)
  const monthScopedExecutions = allExecutions.filter((e) =>
    selectedMonth === 'ALL' ? true : e.month === 'GERAL' || e.month === selectedMonth
  );

  const familyCatalog: Array<{
    familyId: QualityChecklistFamilyId;
    label: string;
    shortLabel: string;
    operation: string;
  }> = [
    {
      familyId: 'check-seguranca-ytd',
      label: '1.2.3.1 Check de Segurança YTD',
      shortLabel: 'Check Segurança YTD',
      operation: 'Entrega / Puxada / Armazém',
    },
    {
      familyId: 'blitz-entrega',
      label: '1.2.3.2 Blitz de Entrega (55 itens)',
      shortLabel: 'Blitz de Entrega',
      operation: 'Entrega',
    },
    {
      familyId: 'blitz-puxada',
      label: '1.2.3.3 Blitz de Puxada (52 itens)',
      shortLabel: 'Blitz de Puxada',
      operation: 'Puxada',
    },
    {
      familyId: 'blitz-empilhadeira',
      label: '1.2.3.4 Blitz Empilhadeira (36 itens)',
      shortLabel: 'Blitz Empilhadeira',
      operation: 'Armazém',
    },
    {
      familyId: 'check-caminhoes',
      label: '1.2.3.5 Check Mensal Caminhões (86 itens)',
      shortLabel: 'Check Caminhões',
      operation: 'Entrega',
    },
    {
      familyId: 'check-puxada',
      label: '1.2.3.6 Check Mensal Puxada (73 itens)',
      shortLabel: 'Check Puxada',
      operation: 'Puxada',
    },
    {
      familyId: 'padroes-visuais',
      label: '1.2.2 Padrões Visuais (Frota / Armazém)',
      shortLabel: 'Padrões Visuais',
      operation: 'Frota Geral',
    },
    {
      familyId: 'check-documental',
      label: '1.1.5 Check Documentação Mensal',
      shortLabel: 'Check Documental',
      operation: 'Documentação',
    },
    {
      familyId: 'frota-15-itens',
      label: '1.1.2 Checklists da Frota (15 itens)',
      shortLabel: 'Checklist 15 Itens',
      operation: 'Cadastro Frota',
    },
  ];

  const families: QualityFamilySummary[] = familyCatalog.map((fam) => {
    const rows = monthScopedExecutions.filter((e) => e.familyId === fam.familyId);
    const uniqueAssets = new Set(rows.map((r) => r.plate)).size;
    return {
      familyId: fam.familyId,
      label: fam.label,
      shortLabel: fam.shortLabel,
      operation: fam.operation,
      executionsCount: rows.length,
      uniqueAssetsCount: uniqueAssets,
      avgConformityPct: Math.round(avg(rows.map((r) => r.conformityPct))),
      avgTraceabilityPct: Math.round(avg(rows.map((r) => r.traceabilityPct))),
      avgRigorPct: Math.round(avg(rows.map((r) => r.rigorPct))),
      ivScorePct: Math.round(avg(rows.map((r) => r.qualityIvPct))),
      nokTotal: rows.reduce((s, r) => s + r.nokCount, 0),
      flaggedCount: rows.filter((r) => r.flags.length > 0).length,
    };
  });

  // Monthly Evolution Series
  const monthlySeries: QualityMonthlyPoint[] = SAFETY_MONTH_COLUMNS.map((col) => {
    const mShort = SAFETY_KEY_TO_SHORT[col.key];
    const mExecs = allExecutions.filter(
      (e) =>
        e.month === mShort &&
        (selectedFamily === 'ALL' ? true : e.familyId === selectedFamily)
    );
    const mProblems = collectStratifiedProblems({
      vehicles,
      blitzEntregaDocs,
      blitzPuxadaDocs,
      blitzEmpilhadeiraDocs,
      caminhoesDocs,
      puxadaCheckDocs,
      estratificacaoDocs,
      includeHistoricalBase: true,
    }).filter((p) => p.month === mShort);

    if (mExecs.length === 0) {
      return {
        month: mShort,
        safetyKey: col.key,
        executionsCount: 0,
        ivPct: null,
        conformityPct: null,
        traceabilityPct: null,
        rigorPct: null,
        nokResolutionPct: null,
      };
    }

    const mConf = Math.round(avg(mExecs.map((e) => e.conformityPct)));
    const mTrace = Math.round(avg(mExecs.map((e) => e.traceabilityPct)));
    const mRigor = Math.round(avg(mExecs.map((e) => e.rigorPct)));
    const mNokRes =
      mProblems.length > 0
        ? Math.round(
            (mProblems.filter((p) => p.resolved).length / mProblems.length) * 100
          )
        : 100;
    const mCov =
      activePlateSet.size > 0
        ? Math.min(
            100,
            Math.round(
              (new Set(mExecs.filter((e) => activePlateSet.has(e.plate)).map((e) => e.plate))
                .size /
                activePlateSet.size) *
                100
            )
          )
        : 100;
    const mIv = Math.round(
      mCov * 0.2 + mTrace * 0.2 + mRigor * 0.2 + mConf * 0.2 + mNokRes * 0.2
    );

    return {
      month: mShort,
      safetyKey: col.key,
      executionsCount: mExecs.length,
      ivPct: mIv,
      conformityPct: mConf,
      traceabilityPct: mTrace,
      rigorPct: mRigor,
      nokResolutionPct: mNokRes,
    };
  });

  const sortedExecutions = [...filteredExecutions].sort((a, b) => {
    if (a.flags.length !== b.flags.length) {
      return b.flags.length - a.flags.length;
    }
    return a.qualityIvPct - b.qualityIvPct;
  });

  const filteredCrossChecks = crossChecks.filter((c) => {
    if (selectedMonth !== 'ALL' && c.month !== selectedMonth) return false;
    if (selectedPlate !== 'ALL' && c.plate !== selectedPlate) return false;
    return true;
  });

  // Grade distribution
  const gradeOrder: QualityGrade[] = ['Excelente', 'Adequado', 'Atenção', 'Crítico'];
  const totalExecs = filteredExecutions.length;
  const gradeDistribution: QualityGradeSlice[] = gradeOrder.map((g) => {
    const count = filteredExecutions.filter((e) => e.grade === g).length;
    return {
      grade: g,
      count,
      pct: totalExecs > 0 ? Math.round((count / totalExecs) * 100) : 0,
    };
  });

  // Operation breakdown
  const operationOrder: Array<'Entrega' | 'Puxada' | 'Armazém' | 'Frota Geral'> = [
    'Entrega',
    'Puxada',
    'Armazém',
    'Frota Geral',
  ];
  const operationBreakdown: QualityOperationSummary[] = operationOrder
    .map((op) => {
      const rows = filteredExecutions.filter((e) => e.operation === op);
      return {
        operation: op,
        executionsCount: rows.length,
        ivPct: Math.round(avg(rows.map((r) => r.qualityIvPct))),
        conformityPct: Math.round(avg(rows.map((r) => r.conformityPct))),
        traceabilityPct: Math.round(avg(rows.map((r) => r.traceabilityPct))),
        rigorPct: Math.round(avg(rows.map((r) => r.rigorPct))),
        flaggedCount: rows.filter((r) => r.flags.length > 0).length,
      };
    })
    .filter((o) => o.executionsCount > 0);

  // Moment breakdown
  const momentOrder: Array<'Saída' | 'Retorno' | 'Mensal' | 'Cadastro'> = [
    'Saída',
    'Retorno',
    'Mensal',
    'Cadastro',
  ];
  const momentBreakdown: QualityMomentSlice[] = momentOrder
    .map((moment) => {
      const rows = filteredExecutions.filter((e) => e.moment === moment);
      return {
        moment,
        count: rows.length,
        pct: totalExecs > 0 ? Math.round((rows.length / totalExecs) * 100) : 0,
        ivPct: Math.round(avg(rows.map((r) => r.qualityIvPct))),
      };
    })
    .filter((m) => m.count > 0);

  // Answer composition across detailed checklists
  const detailedExecs = filteredExecutions.filter((e) => e.totalItems > 1);
  const okTotal = detailedExecs.reduce((s, e) => s + e.okCount, 0);
  const nokTotalAns = detailedExecs.reduce((s, e) => s + e.nokCount, 0);
  const naTotal = detailedExecs.reduce((s, e) => s + e.naCount, 0);
  const totalSlots = detailedExecs.reduce((s, e) => s + e.totalItems, 0);
  const unansweredTotal = Math.max(0, totalSlots - okTotal - nokTotalAns - naTotal);

  // Flag Pareto
  const flagMap = new Map<string, number>();
  for (const exec of filteredExecutions) {
    for (const f of exec.flags) {
      const normalized = f.replace(/\s*\([^)]*\)/g, '').trim();
      flagMap.set(normalized, (flagMap.get(normalized) ?? 0) + 1);
    }
  }
  const totalFlagsCount = Array.from(flagMap.values()).reduce((a, b) => a + b, 0);
  const flagPareto: QualityFlagParetoItem[] = Array.from(flagMap.entries())
    .map(([flag, count]) => ({
      flag,
      count,
      pct: totalFlagsCount > 0 ? Math.round((count / totalFlagsCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Plate Quality Rankings (Bottom 8 & Top 8)
  const plateMap = new Map<string, QualityAuditExecutionRow[]>();
  for (const exec of filteredExecutions) {
    if (!exec.plate || exec.plate === 'ATIVO') continue;
    const list = plateMap.get(exec.plate) ?? [];
    list.push(exec);
    plateMap.set(exec.plate, list);
  }
  const plateRanks: QualityPlateRankItem[] = Array.from(plateMap.entries()).map(
    ([plate, rows]) => ({
      plate,
      operation: rows[0]?.operation ?? 'Frota Geral',
      executionsCount: rows.length,
      avgIvPct: Math.round(avg(rows.map((r) => r.qualityIvPct))),
      avgConformityPct: Math.round(avg(rows.map((r) => r.conformityPct))),
      flaggedCount: rows.filter((r) => r.flags.length > 0).length,
      nokTotal: rows.reduce((s, r) => s + r.nokCount, 0),
    })
  );
  const plateRankingBottom = [...plateRanks]
    .sort((a, b) => a.avgIvPct - b.avgIvPct || b.flaggedCount - a.flaggedCount)
    .slice(0, 8);
  const plateRankingTop = [...plateRanks]
    .sort((a, b) => b.avgIvPct - a.avgIvPct || b.executionsCount - a.executionsCount)
    .slice(0, 8);

  // Inspector & Driver Rankings
  const ignoredPeople = new Set([
    '',
    '—',
    '-',
    'não informado',
    'guarabira',
    'pau brasil (consolidado)',
    'auditoria base',
    'consolidado ytd',
    'padrão visual',
    'entrega',
    'puxada',
    'cadastro documental',
    'sistema frota',
  ]);

  const buildPersonRanking = (
    pickName: (exec: QualityAuditExecutionRow) => string
  ): QualityPersonRankItem[] => {
    const map = new Map<string, QualityAuditExecutionRow[]>();
    for (const exec of filteredExecutions) {
      const rawName = (pickName(exec) ?? '').trim();
      if (!rawName || ignoredPeople.has(rawName.toLowerCase())) continue;
      const list = map.get(rawName) ?? [];
      list.push(exec);
      map.set(rawName, list);
    }
    return Array.from(map.entries())
      .map(([name, rows]) => ({
        name,
        count: rows.length,
        avgIvPct: Math.round(avg(rows.map((r) => r.qualityIvPct))),
        avgConformityPct: Math.round(avg(rows.map((r) => r.conformityPct))),
        avgTraceabilityPct: Math.round(avg(rows.map((r) => r.traceabilityPct))),
        nokTotal: rows.reduce((s, r) => s + r.nokCount, 0),
        flaggedCount: rows.filter((r) => r.flags.length > 0).length,
      }))
      .sort((a, b) => b.count - a.count || b.avgIvPct - a.avgIvPct)
      .slice(0, 10);
  };

  const inspectorRanking = buildPersonRanking((e) => e.responsible);
  const driverRanking = buildPersonRanking((e) => e.driverOrOperator);

  // Heatmap Matrix (Checklist x Month)
  const hasLateMonths = allExecutions.some(
    (e) =>
      e.month === 'SET' || e.month === 'OUT' || e.month === 'NOV' || e.month === 'DEZ'
  );
  const heatmapMonths: StratifiedMonthShort[] = hasLateMonths
    ? STRATIFIED_MONTHS
    : STRATIFIED_MONTHS.slice(0, 8);

  const heatmapRows: QualityHeatmapRow[] = familyCatalog
    .filter((f) => f.familyId !== 'frota-15-itens')
    .map((fam) => ({
      familyId: fam.familyId,
      shortLabel: fam.shortLabel,
      cells: heatmapMonths.map((month) => {
        const rows = allExecutions.filter(
          (e) => e.familyId === fam.familyId && e.month === month
        );
        return {
          month,
          count: rows.length,
          ivPct: rows.length > 0 ? Math.round(avg(rows.map((r) => r.qualityIvPct))) : null,
        };
      }),
    }));

  const flaggedExecutionsCount = filteredExecutions.filter(
    (e) => e.flags.length > 0
  ).length;
  const cleanExecutionsPct =
    totalExecs > 0
      ? Math.round(((totalExecs - flaggedExecutionsCount) / totalExecs) * 100)
      : 100;

  return {
    ivScorePct,
    grade: classifyGrade(ivScorePct),
    pillars: {
      coberturaPct,
      rastreabilidadePct,
      rigorPct,
      conformidadePct,
      tratativaPct,
    },
    totals: {
      totalExecutions: totalExecs,
      activeFleetCount: activePlateSet.size,
      coveredAssetsCount: coveredPlateSet.size,
      totalItemsChecked: filteredExecutions.reduce((s, e) => s + e.answeredItems, 0),
      totalNoks: totalProblemRecords,
      resolvedNoks: resolvedProblemsCount,
      resolvedIn1DayPct,
      flaggedExecutionsCount,
      cleanExecutionsPct,
      crossCheckCount: filteredCrossChecks.length,
      crossCheckConsistentCount: filteredCrossChecks.filter((c) => c.consistent).length,
    },
    answerComposition: {
      okTotal,
      nokTotal: nokTotalAns,
      naTotal,
      unansweredTotal,
      totalSlots,
    },
    gradeDistribution,
    operationBreakdown,
    momentBreakdown,
    flagPareto,
    plateRankingBottom,
    plateRankingTop,
    inspectorRanking,
    driverRanking,
    heatmapMonths,
    heatmapRows,
    families,
    monthlySeries,
    crossChecks: filteredCrossChecks,
    executions: sortedExecutions,
  };
}
