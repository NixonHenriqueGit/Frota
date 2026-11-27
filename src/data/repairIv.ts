import {
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  StratifiedProblemCostCenter,
  StratifiedProblemCriticality,
  StratifiedProblemRecord,
  Vehicle,
} from '../types/fleet';
import {
  STRATIFIED_MONTHS,
  collectStratifiedProblems,
} from './problemStratification';

export const REPAIR_IV_CONFIG_MIME = 'application/vnd.pb-repair-iv-config+json';
export const REPAIR_IV_CONFIG_ID = 'ep-rep-config';
export const REPAIR_ACTION_MIME = 'application/vnd.pb-repair-action+json';
export const REPAIR_ACTION_ID_PREFIX = 'ep-act-';

export type RepairAnsBucket = 'No prazo (ANS)' | 'Fora do ANS' | 'Em aberto';
export type RepairActionStatus = 'Em andamento' | 'Concluído' | 'Atrasado';

export interface RepairIvConfig {
  targetIvPct: number;
  ansImediataDays: number;
  ansAltaDays: number;
  ansMediaDays: number;
  auditorName: string;
  updatedAt: string;
}

export const DEFAULT_REPAIR_IV_CONFIG: RepairIvConfig = {
  targetIvPct: 90,
  ansImediataDays: 1,
  ansAltaDays: 3,
  ansMediaDays: 5,
  auditorName: 'Gestão Frota PB',
  updatedAt: new Date().toLocaleDateString('pt-BR'),
};

export interface RepairActionPlanItem {
  id: string;
  title: string;
  focusArea: string;
  responsible: string;
  deadline: string;
  status: RepairActionStatus;
  impactNote: string;
  isDefaultSeed?: boolean;
}

export const DEFAULT_REPAIR_ACTIONS: RepairActionPlanItem[] = [
  {
    id: 'ep-act-seed-1',
    title: 'Estoque rápido de lâmpadas, fusíveis e chicotes no box de saída',
    focusArea: 'Iluminação · Defeitos Críticos (IMEDIATA)',
    responsible: 'Manutenção Frota / Líder de Pátio',
    deadline: 'Contínuo (Últimos 3 meses)',
    status: 'Em andamento',
    impactNote: 'Reduzir tempo de resposta de itens críticos na saída para ≤ 1 dia.',
    isDefaultSeed: true,
  },
  {
    id: 'ep-act-seed-2',
    title: 'Inspeção prévia de estepe e alarme sonoro no retorno da Puxada',
    focusArea: 'Estepe & Buzina/Sirene · Puxada',
    responsible: 'Equipe Pátio / Borracharia',
    deadline: 'Últimos 3 meses',
    status: 'Em andamento',
    impactNote: 'Tratar desvios antes da próxima saída elevando a aderência ao ANS.',
    isDefaultSeed: true,
  },
  {
    id: 'ep-act-seed-3',
    title: 'Rotina diária de fechamento de NOKs pendentes com mais de 24h',
    focusArea: 'Fechamento de Anomalias · Meta ANS',
    responsible: 'Supervisor de Operação & PCM',
    deadline: 'Últimos 3 meses',
    status: 'Concluído',
    impactNote: 'Eliminar pendências antigas em aberto e estabilizar o IV acima da meta.',
    isDefaultSeed: true,
  },
];

export interface RepairEnrichedRecord extends StratifiedProblemRecord {
  ansLimitDays: number;
  withinAns: boolean;
  ansBucket: RepairAnsBucket;
}

export interface RepairMonthlyPoint {
  month: StratifiedMonthShort;
  totalCount: number;
  resolvedCount: number;
  withinAnsCount: number;
  avgDays: number | null;
  ansPct: number | null;
  ivReparoPct: number | null;
  isLastThree: boolean;
}

export interface RepairCriticalityPoint {
  criticality: StratifiedProblemCriticality;
  ansLimitDays: number;
  totalCount: number;
  resolvedCount: number;
  withinAnsCount: number;
  avgDays: number;
  ansPct: number;
}

export interface RepairOccurrencePoint {
  occurrenceType: string;
  totalCount: number;
  avgDays: number;
  withinAnsCount: number;
  ansPct: number;
}

export interface RepairAnsSlice {
  bucket: RepairAnsBucket;
  count: number;
  pct: number;
}

export interface ComputeRepairIvInput {
  vehicles: Vehicle[];
  blitzEntregaDocs: LegalizedDocumentRecord[];
  blitzPuxadaDocs: LegalizedDocumentRecord[];
  blitzEmpilhadeiraDocs: LegalizedDocumentRecord[];
  caminhoesDocs: LegalizedDocumentRecord[];
  puxadaCheckDocs: LegalizedDocumentRecord[];
  estratificacaoDocs: LegalizedDocumentRecord[];
  selectedMonth?: StratifiedMonthShort | 'ALL';
  selectedOperation?: StratifiedProblemCostCenter | 'ALL';
  selectedCriticality?: StratifiedProblemCriticality | 'ALL';
  selectedAnsBucket?: RepairAnsBucket | 'ALL';
}

export interface RepairIvAnalysis {
  ivReparoPct: number;
  avgRepairDays: number;
  criticalResponseDays: number;
  ansAdherencePct: number;
  closureRatePct: number;
  criticalAnsPct: number;
  totals: {
    totalAnomalies: number;
    resolvedCount: number;
    openCount: number;
    withinAnsCount: number;
    outsideAnsCount: number;
    criticalCount: number;
  };
  monthlySeries: RepairMonthlyPoint[];
  lastThreeMonths: RepairMonthlyPoint[];
  lastThreeAvgIvPct: number;
  byCriticality: RepairCriticalityPoint[];
  ansDistribution: RepairAnsSlice[];
  byOccurrenceType: RepairOccurrencePoint[];
  records: RepairEnrichedRecord[];
}

export function parseRepairIvConfig(
  estratificacaoDocs: LegalizedDocumentRecord[]
): RepairIvConfig {
  const found = estratificacaoDocs.find(
    (d) => d.id === REPAIR_IV_CONFIG_ID || d.fileType === REPAIR_IV_CONFIG_MIME
  );
  if (!found?.fileDataUrl) return DEFAULT_REPAIR_IV_CONFIG;
  try {
    const raw = JSON.parse(found.fileDataUrl) as Partial<RepairIvConfig>;
    return {
      targetIvPct:
        typeof raw.targetIvPct === 'number' && raw.targetIvPct >= 50 && raw.targetIvPct <= 100
          ? Math.round(raw.targetIvPct)
          : DEFAULT_REPAIR_IV_CONFIG.targetIvPct,
      ansImediataDays:
        typeof raw.ansImediataDays === 'number' && raw.ansImediataDays >= 1
          ? Math.round(raw.ansImediataDays)
          : DEFAULT_REPAIR_IV_CONFIG.ansImediataDays,
      ansAltaDays:
        typeof raw.ansAltaDays === 'number' && raw.ansAltaDays >= 1
          ? Math.round(raw.ansAltaDays)
          : DEFAULT_REPAIR_IV_CONFIG.ansAltaDays,
      ansMediaDays:
        typeof raw.ansMediaDays === 'number' && raw.ansMediaDays >= 1
          ? Math.round(raw.ansMediaDays)
          : DEFAULT_REPAIR_IV_CONFIG.ansMediaDays,
      auditorName:
        typeof raw.auditorName === 'string' && raw.auditorName.trim()
          ? raw.auditorName.trim()
          : DEFAULT_REPAIR_IV_CONFIG.auditorName,
      updatedAt:
        typeof raw.updatedAt === 'string' && raw.updatedAt
          ? raw.updatedAt
          : DEFAULT_REPAIR_IV_CONFIG.updatedAt,
    };
  } catch {
    return DEFAULT_REPAIR_IV_CONFIG;
  }
}

export function buildRepairIvConfigRecord(
  config: RepairIvConfig
): LegalizedDocumentRecord {
  const serialized = JSON.stringify(config);
  const nowDate = new Date().toLocaleDateString('pt-BR');
  return {
    id: REPAIR_IV_CONFIG_ID,
    folder: 'ESTRATIFICAÇÃO PROBLEMAS',
    subfolder: '',
    fileName: 'CONFIG_REPARO_ANS_IV',
    fileType: REPAIR_IV_CONFIG_MIME,
    fileSize: serialized.length,
    plate: 'REPARO-IV',
    expiryDate: `${config.targetIvPct}%`,
    referenceDate: config.updatedAt || nowDate,
    notes: `Meta ${config.targetIvPct}% · ANS Imediata ${config.ansImediataDays}d / Alta ${config.ansAltaDays}d / Média ${config.ansMediaDays}d`,
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

export function parseRepairActionPlans(
  estratificacaoDocs: LegalizedDocumentRecord[]
): RepairActionPlanItem[] {
  const storedMap = new Map<string, RepairActionPlanItem>();
  for (const doc of estratificacaoDocs) {
    if (doc.fileType !== REPAIR_ACTION_MIME || !doc.fileDataUrl) continue;
    try {
      const parsed = JSON.parse(doc.fileDataUrl) as Partial<RepairActionPlanItem>;
      if (!parsed.title) continue;
      storedMap.set(doc.id, {
        id: doc.id,
        title: parsed.title,
        focusArea: parsed.focusArea ?? 'Checklist Frota',
        responsible: parsed.responsible ?? 'Manutenção Frota',
        deadline: parsed.deadline ?? 'Últimos 3 meses',
        status:
          parsed.status === 'Concluído' ||
          parsed.status === 'Atrasado' ||
          parsed.status === 'Em andamento'
            ? parsed.status
            : 'Em andamento',
        impactNote: parsed.impactNote ?? '',
        isDefaultSeed: Boolean(parsed.isDefaultSeed),
      });
    } catch {
      // ignore malformed
    }
  }

  const merged: RepairActionPlanItem[] = [];
  for (const seed of DEFAULT_REPAIR_ACTIONS) {
    const override = storedMap.get(seed.id);
    merged.push(override ?? seed);
  }
  for (const [id, item] of storedMap.entries()) {
    if (!DEFAULT_REPAIR_ACTIONS.some((s) => s.id === id)) {
      merged.push(item);
    }
  }
  return merged;
}

export function buildRepairActionRecord(
  action: RepairActionPlanItem
): LegalizedDocumentRecord {
  const serialized = JSON.stringify(action);
  const nowDate = new Date().toLocaleDateString('pt-BR');
  return {
    id: action.id,
    folder: 'ESTRATIFICAÇÃO PROBLEMAS',
    subfolder: '',
    fileName: `ACAO_IV_${action.id}`,
    fileType: REPAIR_ACTION_MIME,
    fileSize: serialized.length,
    plate: 'PLANO-IV',
    expiryDate: action.status,
    referenceDate: action.deadline.slice(0, 40),
    notes: `${action.title} · ${action.responsible}`.slice(0, 500),
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

function getAnsLimitDays(
  criticality: StratifiedProblemCriticality,
  config: RepairIvConfig
): number {
  if (criticality === 'IMEDIATA') return config.ansImediataDays;
  if (criticality === 'ALTA') return config.ansAltaDays;
  return config.ansMediaDays;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function computeSubsetIv(rows: RepairEnrichedRecord[]): {
  ivReparoPct: number;
  ansAdherencePct: number;
  closureRatePct: number;
  criticalAnsPct: number;
} {
  if (rows.length === 0) {
    return {
      ivReparoPct: 100,
      ansAdherencePct: 100,
      closureRatePct: 100,
      criticalAnsPct: 100,
    };
  }
  const withinAnsCount = rows.filter((r) => r.withinAns).length;
  const resolvedCount = rows.filter((r) => r.resolved).length;
  const criticalRows = rows.filter((r) => r.criticality === 'IMEDIATA');
  const criticalWithinAns = criticalRows.filter((r) => r.withinAns).length;

  const ansAdherencePct = Math.round((withinAnsCount / rows.length) * 100);
  const closureRatePct = Math.round((resolvedCount / rows.length) * 100);
  const criticalAnsPct =
    criticalRows.length > 0
      ? Math.round((criticalWithinAns / criticalRows.length) * 100)
      : ansAdherencePct;

  const ivReparoPct = Math.round(
    ansAdherencePct * 0.45 + closureRatePct * 0.3 + criticalAnsPct * 0.25
  );

  return { ivReparoPct, ansAdherencePct, closureRatePct, criticalAnsPct };
}

export function computeRepairIvAnalysis(
  input: ComputeRepairIvInput
): RepairIvAnalysis {
  const {
    vehicles,
    blitzEntregaDocs,
    blitzPuxadaDocs,
    blitzEmpilhadeiraDocs,
    caminhoesDocs,
    puxadaCheckDocs,
    estratificacaoDocs,
    selectedMonth = 'ALL',
    selectedOperation = 'ALL',
    selectedCriticality = 'ALL',
    selectedAnsBucket = 'ALL',
  } = input;

  const config = parseRepairIvConfig(estratificacaoDocs);

  const rawProblems = collectStratifiedProblems({
    vehicles,
    blitzEntregaDocs,
    blitzPuxadaDocs,
    blitzEmpilhadeiraDocs,
    caminhoesDocs,
    puxadaCheckDocs,
    estratificacaoDocs,
    includeHistoricalBase: true,
  });

  const enrichedAll: RepairEnrichedRecord[] = rawProblems.map((p) => {
    const ansLimitDays = getAnsLimitDays(p.criticality, config);
    const withinAns = p.resolved && p.resolutionDays <= ansLimitDays;
    const ansBucket: RepairAnsBucket = !p.resolved
      ? 'Em aberto'
      : withinAns
        ? 'No prazo (ANS)'
        : 'Fora do ANS';
    return {
      ...p,
      ansLimitDays,
      withinAns,
      ansBucket,
    };
  });

  // Base filtered without month (for monthly chart & last 3 months)
  const baseForMonths = enrichedAll.filter((r) => {
    if (selectedOperation !== 'ALL' && r.costCenter !== selectedOperation) return false;
    if (selectedCriticality !== 'ALL' && r.criticality !== selectedCriticality) return false;
    if (selectedAnsBucket !== 'ALL' && r.ansBucket !== selectedAnsBucket) return false;
    return true;
  });

  const filtered = baseForMonths.filter((r) => {
    if (selectedMonth !== 'ALL' && r.month !== selectedMonth) return false;
    return true;
  });

  const { ivReparoPct, ansAdherencePct, closureRatePct, criticalAnsPct } =
    computeSubsetIv(filtered);

  const resolvedRows = filtered.filter((r) => r.resolved);
  const criticalRows = filtered.filter((r) => r.criticality === 'IMEDIATA');
  const criticalResolved = criticalRows.filter((r) => r.resolved);

  const avgRepairDays = Number(
    avg((resolvedRows.length > 0 ? resolvedRows : filtered).map((r) => r.resolutionDays)).toFixed(1)
  );
  const criticalResponseDays = Number(
    avg(
      (criticalResolved.length > 0 ? criticalResolved : criticalRows).map(
        (r) => r.resolutionDays
      )
    ).toFixed(1)
  );

  // Active months for monthly series
  const hasLateMonths = baseForMonths.some(
    (r) => r.month === 'SET' || r.month === 'OUT' || r.month === 'NOV' || r.month === 'DEZ'
  );
  const visibleMonths = hasLateMonths ? STRATIFIED_MONTHS : STRATIFIED_MONTHS.slice(0, 8);

  const activeMonthsList = visibleMonths.filter((m) =>
    baseForMonths.some((r) => r.month === m)
  );
  const lastThreeSet = new Set<StratifiedMonthShort>(activeMonthsList.slice(-3));

  const monthlySeries: RepairMonthlyPoint[] = visibleMonths.map((month) => {
    const rows = baseForMonths.filter((r) => r.month === month);
    if (rows.length === 0) {
      return {
        month,
        totalCount: 0,
        resolvedCount: 0,
        withinAnsCount: 0,
        avgDays: null,
        ansPct: null,
        ivReparoPct: null,
        isLastThree: false,
      };
    }
    const sub = computeSubsetIv(rows);
    const res = rows.filter((r) => r.resolved);
    return {
      month,
      totalCount: rows.length,
      resolvedCount: res.length,
      withinAnsCount: rows.filter((r) => r.withinAns).length,
      avgDays: Number(
        avg((res.length > 0 ? res : rows).map((r) => r.resolutionDays)).toFixed(1)
      ),
      ansPct: sub.ansAdherencePct,
      ivReparoPct: sub.ivReparoPct,
      isLastThree: lastThreeSet.has(month),
    };
  });

  const lastThreeMonths = monthlySeries.filter((m) => m.isLastThree && m.ivReparoPct !== null);
  const lastThreeAvgIvPct =
    lastThreeMonths.length > 0
      ? Math.round(avg(lastThreeMonths.map((m) => m.ivReparoPct ?? 0)))
      : ivReparoPct;

  // By Criticality
  const critOrder: StratifiedProblemCriticality[] = ['IMEDIATA', 'ALTA', 'MÉDIA'];
  const byCriticality: RepairCriticalityPoint[] = critOrder.map((crit) => {
    const rows = filtered.filter((r) => r.criticality === crit);
    const res = rows.filter((r) => r.resolved);
    const within = rows.filter((r) => r.withinAns).length;
    return {
      criticality: crit,
      ansLimitDays: getAnsLimitDays(crit, config),
      totalCount: rows.length,
      resolvedCount: res.length,
      withinAnsCount: within,
      avgDays: Number(
        avg((res.length > 0 ? res : rows).map((r) => r.resolutionDays)).toFixed(1)
      ),
      ansPct: rows.length > 0 ? Math.round((within / rows.length) * 100) : 100,
    };
  });

  // ANS Distribution
  const ansOrder: RepairAnsBucket[] = ['No prazo (ANS)', 'Fora do ANS', 'Em aberto'];
  const ansDistribution: RepairAnsSlice[] = ansOrder.map((bucket) => {
    const count = filtered.filter((r) => r.ansBucket === bucket).length;
    return {
      bucket,
      count,
      pct: filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0,
    };
  });

  // By Occurrence Type (Top 8 by count)
  const typeMap = new Map<string, RepairEnrichedRecord[]>();
  for (const r of filtered) {
    const list = typeMap.get(r.occurrenceType) ?? [];
    list.push(r);
    typeMap.set(r.occurrenceType, list);
  }
  const byOccurrenceType: RepairOccurrencePoint[] = Array.from(typeMap.entries())
    .map(([occurrenceType, rows]) => {
      const res = rows.filter((r) => r.resolved);
      const within = rows.filter((r) => r.withinAns).length;
      return {
        occurrenceType,
        totalCount: rows.length,
        avgDays: Number(
          avg((res.length > 0 ? res : rows).map((r) => r.resolutionDays)).toFixed(1)
        ),
        withinAnsCount: within,
        ansPct: rows.length > 0 ? Math.round((within / rows.length) * 100) : 100,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 8);

  const sortedRecords = [...filtered].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    if (a.withinAns !== b.withinAns) return a.withinAns ? 1 : -1;
    return b.resolutionDays - a.resolutionDays;
  });

  return {
    ivReparoPct,
    avgRepairDays,
    criticalResponseDays,
    ansAdherencePct,
    closureRatePct,
    criticalAnsPct,
    totals: {
      totalAnomalies: filtered.length,
      resolvedCount: resolvedRows.length,
      openCount: filtered.filter((r) => !r.resolved).length,
      withinAnsCount: filtered.filter((r) => r.withinAns).length,
      outsideAnsCount: filtered.filter((r) => r.ansBucket === 'Fora do ANS').length,
      criticalCount: criticalRows.length,
    },
    monthlySeries,
    lastThreeMonths,
    lastThreeAvgIvPct,
    byCriticality,
    ansDistribution,
    byOccurrenceType,
    records: sortedRecords,
  };
}
