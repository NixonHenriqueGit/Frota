import {
  LegalizedDocumentRecord,
  StratifiedMonthShort,
  Vehicle,
} from '../types/fleet';
import { STRATIFIED_MONTHS } from './problemStratification';

export const DTO_RECORD_MIME = 'application/vnd.pb-dto-checklist+json';
export const DTO_CONFIG_MIME = 'application/vnd.pb-dto-config+json';
export const DTO_CONFIG_ID = 'dto-config-meta';
export const DTO_ID_PREFIX = 'dto-';

export type DtoStepAnswer = 'SIM' | 'NAO';

export type DtoOperation = 'Entrega' | 'Puxada' | 'Armazém' | 'Frota Leve' | 'Geral';

export type DtoActionBand =
  | 'Reconhecimento da equipe'
  | 'Dar feedback e realizar nova DTO em mais 1 blitz'
  | 'Refazer treinamento';

export interface DtoStepDefinition {
  number: number;
  id: string;
  label: string;
}

export const DTO_STEPS: DtoStepDefinition[] = [
  {
    number: 1,
    id: 'step-01',
    label: 'Há o uso de 100% dos EPIs previstos para execução da tarefa?',
  },
  {
    number: 2,
    id: 'step-02',
    label:
      'Os requisitos de segurança e meio ambiente colocados no padrão são completamente seguidos',
  },
  {
    number: 3,
    id: 'step-03',
    label: 'Abrir aplicativo de Software de Frota',
  },
  {
    number: 4,
    id: 'step-04',
    label: 'Realizar verificação no veículo e/ou máquina e preencher checklist',
  },
  {
    number: 5,
    id: 'step-05',
    label: 'Colaborador passou por Treinamento?',
  },
  {
    number: 6,
    id: 'step-06',
    label: 'O smartphone está em perfeito funcionamento?',
  },
  {
    number: 7,
    id: 'step-07',
    label: 'Foi feito o Giro 360?',
  },
  {
    number: 8,
    id: 'step-08',
    label: 'Digitar checklist no Software de Frota',
  },
  {
    number: 9,
    id: 'step-09',
    label: 'Bloquear veículo e encaminhar para manutenção',
  },
  {
    number: 10,
    id: 'step-10',
    label: 'Eliminar anomalias identificadas',
  },
  {
    number: 11,
    id: 'step-11',
    label: 'Validar checklist no Software de Frota',
  },
  {
    number: 12,
    id: 'step-12',
    label: 'O funcionário está treinado para executar a tarefa conforme o padrão?',
  },
  {
    number: 13,
    id: 'step-13',
    label:
      'O resultado esperado para este procedimento (tempo, custo, qualidade produtividade, etc) é atingido com execução da tarefa pelo funcionário?',
  },
  {
    number: 14,
    id: 'step-14',
    label:
      'É necessário o funcionário desenvolver novas habilidades ou aprender procedimentos previstos no padrão?',
  },
  {
    number: 15,
    id: 'step-15',
    label:
      'As ferramentas, materiais e equipamentos estão disponíveis e em boas condições para uso?',
  },
  {
    number: 16,
    id: 'step-16',
    label:
      'O padrão alerta para os cuidados especiais para: a) execução da tarefa, b) uso de EPIs necessários, c) riscos de segurança',
  },
  {
    number: 17,
    id: 'step-17',
    label:
      'O padrão é simples, de fácil entendimento, e descreve de forma fácil os passos para executar a tarefa',
  },
  {
    number: 18,
    id: 'step-18',
    label:
      'Padrão está atualizado? (reflete o processo atual e está em sua última revisão)',
  },
  {
    number: 19,
    id: 'step-19',
    label:
      'O padrão e suas referências estão disponíveis em local acessível (Posto de cópia)',
  },
];

export const DTO_REASON_OPTIONS = [
  'DTO Mensal (Mínimo da Liderança)',
  'Acompanhamento de Blitz',
  'Integração / Novo Condutor',
  'Reincidência de Anomalia / Desvio',
  'Reciclagem de Padrão DPO',
] as const;

export interface DtoStepResponse {
  answer: DtoStepAnswer;
  observation: string;
}

export interface DtoRecordPayload {
  id: string;
  date: string; // DD/MM/YYYY
  month: StratifiedMonthShort;
  responsible: string;
  reason: string;
  driver: string;
  vehiclePlate: string;
  vehicleLabel: string;
  operation: DtoOperation;
  startedAtIso?: string;
  finishedAtIso?: string;
  durationSeconds?: number;
  blitzDurationMin?: number;
  steps: Record<string, DtoStepResponse>;
  simCount: number;
  scorePct: number;
  actionBand: DtoActionBand;
  blitzAbove30: boolean;
  generalObservation?: string;
  createdAtIso: string;
}

export interface DtoConfig {
  monthlyTargetCount: number;
  targetScorePct: number;
  updatedAt: string;
}

export const DEFAULT_DTO_CONFIG: DtoConfig = {
  monthlyTargetCount: 10,
  targetScorePct: 80,
  updatedAt: new Date().toLocaleDateString('pt-BR'),
};

export function inferDtoMonthFromDate(dateStr: string): StratifiedMonthShort {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
  if (match) {
    const mIdx = Number(match[2]) - 1;
    if (mIdx >= 0 && mIdx < STRATIFIED_MONTHS.length) {
      return STRATIFIED_MONTHS[mIdx];
    }
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (iso) {
    const mIdx = Number(iso[2]) - 1;
    if (mIdx >= 0 && mIdx < STRATIFIED_MONTHS.length) {
      return STRATIFIED_MONTHS[mIdx];
    }
  }
  return STRATIFIED_MONTHS[new Date().getMonth()] ?? 'NOV';
}

export function inferDtoOperation(
  plate: string,
  vehicles: Vehicle[]
): DtoOperation {
  const norm = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const match = vehicles.find(
    (v) => v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === norm
  );
  if (match) {
    if (match.category === 'Empilhadeira' || match.sector === 'Armazém') {
      return 'Armazém';
    }
    if (
      match.sector === 'Puxada' ||
      match.category === 'Tração Caminhão Trator' ||
      match.category === 'Carga Semi-Reboque'
    ) {
      return 'Puxada';
    }
    if (match.category === 'Frota Leve' || match.sector === 'Vendas' || match.sector === 'Marketing') {
      return 'Frota Leve';
    }
    return 'Entrega';
  }
  if (norm.startsWith('EMP') || norm.startsWith('PAL')) return 'Armazém';
  return 'Entrega';
}

export function computeDtoScoreAndAction(
  steps: Record<string, DtoStepResponse>,
  blitzDurationMin?: number
): {
  simCount: number;
  naoCount: number;
  scorePct: number;
  actionBand: DtoActionBand;
  blitzAbove30: boolean;
} {
  let simCount = 0;
  for (const def of DTO_STEPS) {
    if (steps[def.id]?.answer === 'SIM') {
      simCount += 1;
    }
  }
  const total = DTO_STEPS.length;
  const naoCount = total - simCount;
  const scorePct = Math.round((simCount / total) * 100);
  const actionBand: DtoActionBand =
    scorePct === 100
      ? 'Reconhecimento da equipe'
      : scorePct >= 80
        ? 'Dar feedback e realizar nova DTO em mais 1 blitz'
        : 'Refazer treinamento';
  const blitzAbove30 =
    typeof blitzDurationMin === 'number' &&
    Number.isFinite(blitzDurationMin) &&
    blitzDurationMin > 30;

  return { simCount, naoCount, scorePct, actionBand, blitzAbove30 };
}

export function buildDtoConfigRecord(config: DtoConfig): LegalizedDocumentRecord {
  const serialized = JSON.stringify(config);
  const nowDate = new Date().toLocaleDateString('pt-BR');
  return {
    id: DTO_CONFIG_ID,
    folder: 'DTO',
    subfolder: '',
    fileName: 'CONFIG_DTO_MENSAL',
    fileType: DTO_CONFIG_MIME,
    fileSize: serialized.length,
    plate: 'DTO-CONFIG',
    expiryDate: `${config.monthlyTargetCount}/mês`,
    referenceDate: config.updatedAt || nowDate,
    notes: `Meta mensal ${config.monthlyTargetCount} DTOs · Pontuação mínima ${config.targetScorePct}%`,
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

export function parseDtoConfig(dtoDocs: LegalizedDocumentRecord[]): DtoConfig {
  const found = dtoDocs.find(
    (d) => d.id === DTO_CONFIG_ID || d.fileType === DTO_CONFIG_MIME
  );
  if (!found?.fileDataUrl) return DEFAULT_DTO_CONFIG;
  try {
    const raw = JSON.parse(found.fileDataUrl) as Partial<DtoConfig>;
    return {
      monthlyTargetCount:
        typeof raw.monthlyTargetCount === 'number' && raw.monthlyTargetCount >= 1
          ? Math.round(raw.monthlyTargetCount)
          : DEFAULT_DTO_CONFIG.monthlyTargetCount,
      targetScorePct:
        typeof raw.targetScorePct === 'number' &&
        raw.targetScorePct >= 50 &&
        raw.targetScorePct <= 100
          ? Math.round(raw.targetScorePct)
          : DEFAULT_DTO_CONFIG.targetScorePct,
      updatedAt:
        typeof raw.updatedAt === 'string' && raw.updatedAt
          ? raw.updatedAt
          : DEFAULT_DTO_CONFIG.updatedAt,
    };
  } catch {
    return DEFAULT_DTO_CONFIG;
  }
}

export function buildDtoLegalizedRecord(
  payload: DtoRecordPayload
): LegalizedDocumentRecord {
  const safeId = payload.id.startsWith(DTO_ID_PREFIX)
    ? payload.id
    : `${DTO_ID_PREFIX}${payload.id}`;
  const normalized: DtoRecordPayload = {
    ...payload,
    id: safeId,
  };
  const serialized = JSON.stringify(normalized);
  const nowDate = new Date().toLocaleDateString('pt-BR');

  return {
    id: safeId,
    folder: 'DTO',
    subfolder: '',
    fileName: `DTO_${normalized.vehiclePlate || 'FROTA'}_${normalized.driver}`.slice(0, 180),
    fileType: DTO_RECORD_MIME,
    fileSize: serialized.length,
    plate: (normalized.vehiclePlate || 'DTO').slice(0, 20),
    expiryDate: `${normalized.scorePct}%`,
    referenceDate: normalized.date.slice(0, 40),
    notes: `${normalized.responsible} · ${normalized.driver} · ${normalized.actionBand}`.slice(
      0,
      500
    ),
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}

export function parseDtoRecords(
  dtoDocs: LegalizedDocumentRecord[]
): DtoRecordPayload[] {
  const items: DtoRecordPayload[] = [];
  for (const doc of dtoDocs) {
    if (doc.id === DTO_CONFIG_ID || doc.fileType === DTO_CONFIG_MIME) continue;
    if (!doc.fileDataUrl) continue;
    try {
      const parsed = JSON.parse(doc.fileDataUrl) as Partial<DtoRecordPayload>;
      if (!parsed.driver || !parsed.responsible || !parsed.steps) continue;
      const computed = computeDtoScoreAndAction(
        parsed.steps,
        parsed.blitzDurationMin
      );
      items.push({
        id: doc.id,
        date: parsed.date || doc.referenceDate || '',
        month: parsed.month || inferDtoMonthFromDate(parsed.date || ''),
        responsible: parsed.responsible,
        reason: parsed.reason || 'DTO Mensal (Mínimo da Liderança)',
        driver: parsed.driver,
        vehiclePlate: parsed.vehiclePlate || doc.plate || '-',
        vehicleLabel: parsed.vehicleLabel || parsed.vehiclePlate || '-',
        operation: parsed.operation || 'Entrega',
        startedAtIso: parsed.startedAtIso,
        finishedAtIso: parsed.finishedAtIso,
        durationSeconds:
          typeof parsed.durationSeconds === 'number'
            ? parsed.durationSeconds
            : undefined,
        blitzDurationMin: parsed.blitzDurationMin,
        steps: parsed.steps,
        simCount: computed.simCount,
        scorePct: computed.scorePct,
        actionBand: computed.actionBand,
        blitzAbove30: computed.blitzAbove30,
        generalObservation: parsed.generalObservation || '',
        createdAtIso: parsed.createdAtIso || '',
      });
    } catch {
      // ignore malformed record
    }
  }
  return items.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
}

export interface DtoMonthlyStat {
  month: StratifiedMonthShort;
  count: number;
  avgScorePct: number | null;
  goalPct: number;
}

export interface DtoStepDeviation {
  number: number;
  id: string;
  label: string;
  naoCount: number;
  simCount: number;
  conformityPct: number;
}

export interface DtoLeaderStat {
  responsible: string;
  count: number;
  avgScorePct: number;
  perfectCount: number;
}

export interface DtoActionDistribution {
  band: DtoActionBand;
  count: number;
  pct: number;
  color: string;
}

export interface DtoAnalysis {
  totalCount: number;
  avgScorePct: number;
  perfectCount: number;
  feedbackCount: number;
  retrainCount: number;
  blitzAbove30Count: number;
  avgDurationMin: number;
  uniqueDriversCount: number;
  monthlyGoalAttainmentPct: number;
  monthlySeries: DtoMonthlyStat[];
  actionDistribution: DtoActionDistribution[];
  stepDeviations: DtoStepDeviation[];
  byLeader: DtoLeaderStat[];
}

export function computeDtoAnalysis(
  records: DtoRecordPayload[],
  config: DtoConfig
): DtoAnalysis {
  const totalCount = records.length;
  const avgScorePct =
    totalCount > 0
      ? Math.round(records.reduce((acc, r) => acc + r.scorePct, 0) / totalCount)
      : 0;

  const perfectCount = records.filter((r) => r.scorePct === 100).length;
  const feedbackCount = records.filter(
    (r) => r.scorePct >= 80 && r.scorePct < 100
  ).length;
  const retrainCount = records.filter((r) => r.scorePct < 80).length;
  const blitzAbove30Count = records.filter((r) => r.blitzAbove30).length;
  const durationRows = records.filter(
    (r) => typeof r.durationSeconds === 'number' && r.durationSeconds > 0
  );
  const avgDurationMin =
    durationRows.length > 0
      ? Math.round(
          durationRows.reduce((acc, r) => acc + (r.durationSeconds ?? 0) / 60, 0) /
            durationRows.length
        )
      : 0;

  const uniqueDrivers = new Set(
    records.map((r) => r.driver.trim().toLowerCase()).filter(Boolean)
  );

  const currentMonth = STRATIFIED_MONTHS[new Date().getMonth()] ?? 'NOV';
  const currentMonthCount = records.filter((r) => r.month === currentMonth).length;
  const baseGoalCount = currentMonthCount > 0 ? currentMonthCount : totalCount;
  const monthlyGoalAttainmentPct =
    config.monthlyTargetCount > 0
      ? Math.min(
          100,
          Math.round((baseGoalCount / config.monthlyTargetCount) * 100)
        )
      : 100;

  const monthlySeries: DtoMonthlyStat[] = STRATIFIED_MONTHS.map((month) => {
    const rows = records.filter((r) => r.month === month);
    const count = rows.length;
    const avgScore =
      count > 0
        ? Math.round(rows.reduce((acc, r) => acc + r.scorePct, 0) / count)
        : null;
    const goalPct =
      config.monthlyTargetCount > 0
        ? Math.min(100, Math.round((count / config.monthlyTargetCount) * 100))
        : 0;
    return { month, count, avgScorePct: avgScore, goalPct };
  });

  const actionDistribution: DtoActionDistribution[] = [
    {
      band: 'Reconhecimento da equipe',
      count: perfectCount,
      pct: totalCount > 0 ? Math.round((perfectCount / totalCount) * 100) : 0,
      color: '#1565D8',
    },
    {
      band: 'Dar feedback e realizar nova DTO em mais 1 blitz',
      count: feedbackCount,
      pct: totalCount > 0 ? Math.round((feedbackCount / totalCount) * 100) : 0,
      color: '#60A5FA',
    },
    {
      band: 'Refazer treinamento',
      count: retrainCount,
      pct: totalCount > 0 ? Math.round((retrainCount / totalCount) * 100) : 0,
      color: '#06295A',
    },
  ];

  const stepDeviations: DtoStepDeviation[] = DTO_STEPS.map((def) => {
    let naoCount = 0;
    let simCount = 0;
    for (const rec of records) {
      if (rec.steps[def.id]?.answer === 'NAO') {
        naoCount += 1;
      } else if (rec.steps[def.id]?.answer === 'SIM') {
        simCount += 1;
      }
    }
    const answered = simCount + naoCount;
    const conformityPct =
      answered > 0 ? Math.round((simCount / answered) * 100) : 100;
    return {
      number: def.number,
      id: def.id,
      label: def.label,
      naoCount,
      simCount,
      conformityPct,
    };
  }).sort((a, b) => b.naoCount - a.naoCount || a.number - b.number);

  const leaderMap = new Map<string, DtoRecordPayload[]>();
  for (const r of records) {
    const key = r.responsible.trim() || 'Não informado';
    const list = leaderMap.get(key) ?? [];
    list.push(r);
    leaderMap.set(key, list);
  }
  const byLeader: DtoLeaderStat[] = Array.from(leaderMap.entries())
    .map(([responsible, rows]) => ({
      responsible,
      count: rows.length,
      avgScorePct: Math.round(
        rows.reduce((acc, r) => acc + r.scorePct, 0) / rows.length
      ),
      perfectCount: rows.filter((r) => r.scorePct === 100).length,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCount,
    avgScorePct,
    perfectCount,
    feedbackCount,
    retrainCount,
    blitzAbove30Count,
    avgDurationMin,
    uniqueDriversCount: uniqueDrivers.size,
    monthlyGoalAttainmentPct,
    monthlySeries,
    actionDistribution,
    stepDeviations,
    byLeader,
  };
}
