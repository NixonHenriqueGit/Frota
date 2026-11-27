import {
  BlitzItemStatus,
  CaminhoesCheckColumnDef,
  CaminhoesCheckPayload,
  CaminhoesZoneKey,
  ComplianceMonth,
  LegalizedDocumentRecord,
} from '../types/fleet';
import { BLITZ_MONTHS, getCurrentComplianceMonth } from './blitzEntregaSeed';

export const CAMINHOES_MIME = 'application/vnd.pb-check-caminhoes+json';

export const CAMINHOES_MONTH_ABBR: Record<ComplianceMonth, string> = {
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

export interface CaminhoesZoneMeta {
  key: CaminhoesZoneKey;
  label: string;
  shortLabel: string;
  headerBg: string;
  badgeClass: string;
}

export const CAMINHOES_ZONES: CaminhoesZoneMeta[] = [
  {
    key: 'cabine',
    label: '1. Cabine',
    shortLabel: 'CABINE',
    headerBg: 'bg-[#00A8E8] text-white',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  {
    key: 'frontal',
    label: '2. Frontal',
    shortLabel: 'FRONTAL',
    headerBg: 'bg-[#0070C0] text-white',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
  },
  {
    key: 'bau',
    label: '3. Baú',
    shortLabel: 'BAÚ',
    headerBg: 'bg-[#5B21B6] text-white',
    badgeClass: 'bg-violet-100 text-violet-900 border-violet-200',
  },
  {
    key: 'traseira',
    label: '4. Traseira',
    shortLabel: 'TRASEIRA',
    headerBg: 'bg-[#002060] text-white',
    badgeClass: 'bg-indigo-100 text-indigo-950 border-indigo-200',
  },
  {
    key: 'pneus',
    label: '5. Pneus',
    shortLabel: 'PNEUS',
    headerBg: 'bg-[#6D28D9] text-white',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  {
    key: 'extras',
    label: '6. Itens Extras',
    shortLabel: 'ITENS EXTRAS',
    headerBg: 'bg-[#2C4259] text-white',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-300',
  },
];

export const CAMINHOES_COLUMNS: CaminhoesCheckColumnDef[] = [
  // CABINE (15)
  { id: 'cm_cab_01', zone: 'cabine', tipo: 'CABINE', item: 'DOCUMENTOS OBRIGATÓRIOS', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_cab_02', zone: 'cabine', tipo: 'CABINE', item: '5S', classificacao: 'QUALIDADE', gravidade: 'LEVE/MÉDIO' },
  { id: 'cm_cab_03', zone: 'cabine', tipo: 'CABINE', item: 'FORRO DE TETO', classificacao: 'QUALIDADE', gravidade: 'LEVE/MÉDIO' },
  { id: 'cm_cab_04', zone: 'cabine', tipo: 'CABINE', item: 'MANOPLA', classificacao: 'QUALIDADE/SEGURANÇA', gravidade: 'LEVE/BLOQUEIO IMEDIATO' },
  { id: 'cm_cab_05', zone: 'cabine', tipo: 'CABINE', item: 'VOLANTE', classificacao: 'QUALIDADE/SEGURANÇA', gravidade: 'LEVE/BLOQUEIO IMEDIATO' },
  { id: 'cm_cab_06', zone: 'cabine', tipo: 'CABINE', item: 'BUZINA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_cab_07', zone: 'cabine', tipo: 'CABINE', item: 'EXTINTOR', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_cab_08', zone: 'cabine', tipo: 'CABINE', item: 'PROTEÇÃO CONTRA SOL E TEMPERATURAS', classificacao: 'SEGURANÇA', gravidade: 'LEVE' },
  { id: 'cm_cab_09', zone: 'cabine', tipo: 'CABINE', item: 'SENSOR DO CINTO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_cab_10', zone: 'cabine', tipo: 'CABINE', item: 'CINTO DE SEGURANÇA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_cab_11', zone: 'cabine', tipo: 'CABINE', item: 'PAINÉIS (FRONTAL E PORTA)', classificacao: 'QUALIDADE/SEGURANÇA', gravidade: 'LEVE/MÉDIO' },
  { id: 'cm_cab_12', zone: 'cabine', tipo: 'CABINE', item: 'MAÇANETAS E FECHAMENTO DA PORTA', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO/BLOQUEIO IMEDIATO' },
  { id: 'cm_cab_13', zone: 'cabine', tipo: 'CABINE', item: 'ESTRUTURA DO BANCO', classificacao: 'QUALIDADE', gravidade: 'MÉDIO' },
  { id: 'cm_cab_14', zone: 'cabine', tipo: 'CABINE', item: 'LADO EXTERNO', classificacao: 'QUALIDADE', gravidade: 'LEVE/MÉDIO' },
  { id: 'cm_cab_15', zone: 'cabine', tipo: 'CABINE', item: 'PONTOS DE APOIO DE ACESSO A CABINE', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/BLOQUEIO IMEDIATO' },

  // FRONTAL (12)
  { id: 'cm_fro_01', zone: 'frontal', tipo: 'FRONTAL', item: 'FAROL', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_fro_02', zone: 'frontal', tipo: 'FRONTAL', item: 'FAROL', classificacao: 'QUALIDADE', gravidade: 'LEVE/GRAVE' },
  { id: 'cm_fro_03', zone: 'frontal', tipo: 'FRONTAL', item: 'PISCA DIANTEIRO E AUXILIAR', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_fro_04', zone: 'frontal', tipo: 'FRONTAL', item: 'PISCA DIANTEIRO E AUXILIAR', classificacao: 'QUALIDADE', gravidade: 'LEVE/GRAVE' },
  { id: 'cm_fro_05', zone: 'frontal', tipo: 'FRONTAL', item: 'PARA-CHOQUE DIANTEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE/GRAVE' },
  { id: 'cm_fro_06', zone: 'frontal', tipo: 'FRONTAL', item: 'LIMPADOR', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_fro_07', zone: 'frontal', tipo: 'FRONTAL', item: 'VIDROS FRONTAIS E LATERAIS', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/BLOQUEIO IMEDIATO' },
  { id: 'cm_fro_08', zone: 'frontal', tipo: 'FRONTAL', item: 'PLACA DO VEÍCULO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/BLOQUEIO IMEDIATO' },
  { id: 'cm_fro_09', zone: 'frontal', tipo: 'FRONTAL', item: 'CÓDIGO DE IDENTIFICAÇÃO DO VEÍCULO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_fro_10', zone: 'frontal', tipo: 'FRONTAL', item: 'ADESIVOS E IDENTIFICAÇÃO DE TRÂNSITO OBRIGATÓRIOS', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_fro_11', zone: 'frontal', tipo: 'FRONTAL', item: 'RETROVISORES', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_fro_12', zone: 'frontal', tipo: 'FRONTAL', item: 'RETROVISORES', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // BAÚ (31)
  { id: 'cm_bau_01', zone: 'bau', tipo: 'BAÚ', item: 'PUXADOR DE BAIA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_02', zone: 'bau', tipo: 'BAÚ', item: 'PUXADOR DE BAIA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_03', zone: 'bau', tipo: 'BAÚ', item: 'ALÇA PEGA MÃO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_04', zone: 'bau', tipo: 'BAÚ', item: 'ALÇA PEGA MÃO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_05', zone: 'bau', tipo: 'BAÚ', item: 'PLATAFORMA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_06', zone: 'bau', tipo: 'BAÚ', item: 'PLATAFORMA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_07', zone: 'bau', tipo: 'BAÚ', item: 'KIT ERGONÔMICO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_08', zone: 'bau', tipo: 'BAÚ', item: 'KIT ERGONÔMICO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_09', zone: 'bau', tipo: 'BAÚ', item: 'ILUMINAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_bau_10', zone: 'bau', tipo: 'BAÚ', item: 'LIMPEZA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_11', zone: 'bau', tipo: 'BAÚ', item: 'BAIA CORTINA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_12', zone: 'bau', tipo: 'BAÚ', item: 'BORRACHA DE BAIA', classificacao: 'SEGURANÇA', gravidade: 'LEVE' },
  { id: 'cm_bau_13', zone: 'bau', tipo: 'BAÚ', item: 'BORRACHA DE BAIA', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_bau_14', zone: 'bau', tipo: 'BAÚ', item: 'BORRACHA DE BAIA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_15', zone: 'bau', tipo: 'BAÚ', item: 'BORRACHA DE BAIA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_16', zone: 'bau', tipo: 'BAÚ', item: 'ANTI-GUILHOTINA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_17', zone: 'bau', tipo: 'BAÚ', item: 'ANTI-GUILHOTINA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_18', zone: 'bau', tipo: 'BAÚ', item: 'LUZES VIGIA', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_bau_19', zone: 'bau', tipo: 'BAÚ', item: 'LUZES VIGIA', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_bau_20', zone: 'bau', tipo: 'BAÚ', item: 'ANTICICLISTA/ ESTRIBO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_bau_21', zone: 'bau', tipo: 'BAÚ', item: 'ANTICICLISTA/ ESTRIBO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_22', zone: 'bau', tipo: 'BAÚ', item: 'ADESIVO DE AUTORIDADES DE TRÂNSITO COMPETENTE', classificacao: 'SEGURANÇA', gravidade: 'LEVE' },
  { id: 'cm_bau_23', zone: 'bau', tipo: 'BAÚ', item: 'FAIXAS REFLETIVAS LATERAL', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_24', zone: 'bau', tipo: 'BAÚ', item: 'FAIXAS REFLETIVAS LATERAL', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_25', zone: 'bau', tipo: 'BAÚ', item: 'LEVANTA FIO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_bau_26', zone: 'bau', tipo: 'BAÚ', item: 'LEVANTA FIO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_27', zone: 'bau', tipo: 'BAÚ', item: 'QUALIDADE VISUAL DO BAÚ', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_bau_28', zone: 'bau', tipo: 'BAÚ', item: 'QUALIDADE ESTRUTURAL DO BAÚ (INTERNA E EXTERNA)', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'cm_bau_29', zone: 'bau', tipo: 'BAÚ', item: 'QUALIDADE ESTRUTURAL DO BAÚ (INTERNA E EXTERNA)', classificacao: 'QUALIDADE', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_bau_30', zone: 'bau', tipo: 'BAÚ', item: 'COFRE', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_bau_31', zone: 'bau', tipo: 'BAÚ', item: 'COFRE', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // TRASEIRA (20)
  { id: 'cm_tra_01', zone: 'traseira', tipo: 'TRASEIRA', item: 'PARA-CHOQUE TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_tra_02', zone: 'traseira', tipo: 'TRASEIRA', item: 'PARA-CHOQUE TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'cm_tra_03', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAROL TRASEIRO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_tra_04', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAROL TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_tra_05', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAROL TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'cm_tra_06', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE RÉ E SINAL SONORO DE RÉ', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_tra_07', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE RÉ E SINAL SONORO DE RÉ', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_tra_08', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE RÉ E SINAL SONORO DE RÉ', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'cm_tra_09', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE FREIO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_tra_10', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE FREIO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_tra_11', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE FREIO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'cm_tra_12', zone: 'traseira', tipo: 'TRASEIRA', item: 'PISCA TRASEIRO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_tra_13', zone: 'traseira', tipo: 'TRASEIRA', item: 'PISCA TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_tra_14', zone: 'traseira', tipo: 'TRASEIRA', item: 'PISCA TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'cm_tra_15', zone: 'traseira', tipo: 'TRASEIRA', item: 'PLACA TRASEIRA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_tra_16', zone: 'traseira', tipo: 'TRASEIRA', item: 'PLACA TRASEIRA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_tra_17', zone: 'traseira', tipo: 'TRASEIRA', item: 'CÓDIGO DE IDENTIFICAÇÃO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'cm_tra_18', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAIXA REFLETIVA DO PARACHOQUE', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_tra_19', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAIXA REFLETIVA DO PARACHOQUE', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_tra_20', zone: 'traseira', tipo: 'TRASEIRA', item: 'ADESIVOS OBRIGATÓRIOS DE SEGURANÇA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },

  // PNEUS (3)
  { id: 'cm_pne_01', zone: 'pneus', tipo: 'PNEUS', item: 'MILIMETRAGEM', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_pne_02', zone: 'pneus', tipo: 'PNEUS', item: 'ESTADO DE CONSERVAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_pne_03', zone: 'pneus', tipo: 'PNEUS', item: 'ESTADO DE CONSERVAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // ITENS EXTRAS (5)
  { id: 'cm_ext_01', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'KIT HIGIENIZAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_ext_02', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'FIAÇÃO EXPOSTA', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'cm_ext_03', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'FIAÇÃO EXPOSTA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'cm_ext_04', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'FIAÇÃO EXPOSTA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'cm_ext_05', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'PROTEÇÃO DAS BATERIAS', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
];

export function createCaminhoesAllOkMap(
  overrides: Record<string, BlitzItemStatus> = {}
): Record<string, BlitzItemStatus> {
  const map: Record<string, BlitzItemStatus> = {};
  for (const col of CAMINHOES_COLUMNS) {
    map[col.id] = overrides[col.id] ?? 'OK';
  }
  return map;
}

export function computeCaminhoesPercent(itemsMap: Record<string, BlitzItemStatus>): {
  percent: number;
  okCount: number;
  nokCount: number;
  naCount: number;
} {
  let okCount = 0;
  let nokCount = 0;
  let naCount = 0;

  for (const col of CAMINHOES_COLUMNS) {
    const st = itemsMap[col.id];
    if (st === 'OK') okCount += 1;
    else if (st === 'NOK') nokCount += 1;
    else if (st === 'NA') naCount += 1;
  }

  const applicable = okCount + nokCount;
  const percent = applicable === 0 ? 100 : Math.round((okCount / applicable) * 100);
  return { percent, okCount, nokCount, naCount };
}

const DEFAULT_TRUCK_PLATES = [
  'NPR2601',
  'OXO0532',
  'OXO0542',
  'OXO0552',
  'OXO0782',
  'QSK7D92',
  'RLR8G79',
  'RLU4H49',
  'RLW0C17',
  'SLB3J76',
  'SLB4A26',
  'SLB4A56',
  'TOU7F39',
  'TOZ8B20',
  'TOZ8B50',
  'QFG1259',
];

export const CAMINHOES_SEED_ROWS: CaminhoesCheckPayload[] = DEFAULT_TRUCK_PLATES.map(
  (plate) => {
    const overrides: Record<string, BlitzItemStatus> = {};
    if (plate === 'OXO0532') overrides.cm_bau_11 = 'NOK';
    if (plate === 'SLB4A56') overrides.cm_fro_06 = 'NOK';
    const items = createCaminhoesAllOkMap(overrides);
    const { percent } = computeCaminhoesPercent(items);
    return {
      id: `cm-seed-jan-${plate.toLowerCase()}`,
      mes: 'JANEIRO',
      placa: plate,
      data: '01/01/2026',
      responsavel: '',
      percentual: percent,
      items,
    };
  }
);

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

export function serializeCaminhoesRecord(payload: CaminhoesCheckPayload): string {
  const json = JSON.stringify(payload);
  return `data:${CAMINHOES_MIME};base64,${encodeUtf8Base64(json)}`;
}

export function parseCaminhoesRecord(
  dataUrl: string | undefined,
  fallbackId = ''
): CaminhoesCheckPayload | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = dataUrl.slice(commaIdx + 1);
    const json = dataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<CaminhoesCheckPayload>;
    if (!parsed.placa) return null;

    const cleanItems: Record<string, BlitzItemStatus> = {};
    if (parsed.items && typeof parsed.items === 'object') {
      for (const col of CAMINHOES_COLUMNS) {
        const val = parsed.items[col.id];
        if (val === 'OK' || val === 'NOK' || val === 'NA') {
          cleanItems[col.id] = val;
        } else {
          cleanItems[col.id] = 'OK';
        }
      }
    } else {
      for (const col of CAMINHOES_COLUMNS) {
        cleanItems[col.id] = 'OK';
      }
    }

    const validMonth: ComplianceMonth =
      BLITZ_MONTHS.find((m) => m.month === parsed.mes)?.month ??
      getCurrentComplianceMonth();

    const { percent } = computeCaminhoesPercent(cleanItems);

    return {
      id: String(parsed.id ?? fallbackId),
      mes: validMonth,
      placa: String(parsed.placa ?? '').toUpperCase().trim(),
      data: String(parsed.data ?? ''),
      responsavel: String(parsed.responsavel ?? ''),
      percentual:
        typeof parsed.percentual === 'number' && Number.isFinite(parsed.percentual)
          ? Math.max(0, Math.min(100, Math.round(parsed.percentual)))
          : percent,
      momento: parsed.momento === 'Retorno' ? 'Retorno' : 'Saída',
      items: cleanItems,
    };
  } catch {
    return null;
  }
}

export function buildCaminhoesRecord(
  payload: CaminhoesCheckPayload,
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const plateSlug = payload.placa.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'cam';
  const monthSlug = (CAMINHOES_MONTH_ABBR[payload.mes] ?? 'mes').toLowerCase();
  const safeId =
    payload.id.startsWith('cm-') && !payload.id.startsWith('cm-seed-')
      ? payload.id
      : `cm-${monthSlug}-${plateSlug}-${Date.now().toString(36)}`;
  const normalizedPayload: CaminhoesCheckPayload = { ...payload, id: safeId };
  const finalSerialized = serializeCaminhoesRecord(normalizedPayload);
  const stats = computeCaminhoesPercent(normalizedPayload.items);

  return {
    id: safeId,
    folder: 'CAMINHÕES',
    subfolder: '',
    fileName: `CAMINHOES_${CAMINHOES_MONTH_ABBR[normalizedPayload.mes]}_${normalizedPayload.placa}`,
    fileType: CAMINHOES_MIME,
    fileSize: finalSerialized.length,
    plate: normalizedPayload.placa.slice(0, 20),
    expiryDate: normalizedPayload.mes,
    referenceDate: normalizedPayload.data.slice(0, 40),
    notes: `${normalizedPayload.percentual}% (${stats.nokCount} NOK)${normalizedPayload.responsavel ? ` · ${normalizedPayload.responsavel}` : ''}`.slice(
      0,
      500
    ),
    uploadedAt: nowDate,
    fileDataUrl: finalSerialized,
  };
}
