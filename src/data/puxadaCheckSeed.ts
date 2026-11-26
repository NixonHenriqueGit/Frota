import {
  BlitzItemStatus,
  ComplianceMonth,
  LegalizedDocumentRecord,
  PuxadaCheckColumnDef,
  PuxadaCheckPayload,
  PuxadaZoneKey,
} from '../types/fleet';
import { BLITZ_MONTHS, getCurrentComplianceMonth } from './blitzEntregaSeed';
import { CAMINHOES_MONTH_ABBR } from './caminhoesCheckSeed';

export const PUXADA_MIME = 'application/vnd.pb-check-puxada+json';

export const PUXADA_MONTH_ABBR = CAMINHOES_MONTH_ABBR;

export interface PuxadaZoneMeta {
  key: PuxadaZoneKey;
  label: string;
  shortLabel: string;
  headerBg: string;
  badgeClass: string;
}

export const PUXADA_ZONES: PuxadaZoneMeta[] = [
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
    key: 'sider',
    label: '3. Sider',
    shortLabel: 'SIDER',
    headerBg: 'bg-[#5B21B6] text-white',
    badgeClass: 'bg-violet-100 text-violet-900 border-violet-200',
  },
  {
    key: 'plataforma',
    label: '4. Plataforma Elevatória',
    shortLabel: 'PLATAFORMA',
    headerBg: 'bg-[#7C3AED] text-white',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  {
    key: 'traseira',
    label: '5. Traseira',
    shortLabel: 'TRASEIRA',
    headerBg: 'bg-[#002060] text-white',
    badgeClass: 'bg-indigo-100 text-indigo-950 border-indigo-200',
  },
  {
    key: 'pneus',
    label: '6. Pneus',
    shortLabel: 'PNEUS',
    headerBg: 'bg-[#6D28D9] text-white',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  {
    key: 'extras',
    label: '7. Itens Extras',
    shortLabel: 'ITENS EXTRAS',
    headerBg: 'bg-[#2C4259] text-white',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-300',
  },
];

export const PUXADA_COLUMNS: PuxadaCheckColumnDef[] = [
  // CABINE (15)
  { id: 'px_cab_01', zone: 'cabine', tipo: 'CABINE', item: 'DOCUMENTOS OBRIGATÓRIOS', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_cab_02', zone: 'cabine', tipo: 'CABINE', item: '5S', classificacao: 'QUALIDADE', gravidade: 'LEVE/MÉDIO' },
  { id: 'px_cab_03', zone: 'cabine', tipo: 'CABINE', item: 'FORRO DE TETO', classificacao: 'QUALIDADE', gravidade: 'LEVE/MÉDIO' },
  { id: 'px_cab_04', zone: 'cabine', tipo: 'CABINE', item: 'MANOPLA', classificacao: 'QUALIDADE/SEGURANÇA', gravidade: 'LEVE/BLOQUEIO IMEDIATO' },
  { id: 'px_cab_05', zone: 'cabine', tipo: 'CABINE', item: 'VOLANTE', classificacao: 'QUALIDADE/SEGURANÇA', gravidade: 'LEVE/BLOQUEIO IMEDIATO' },
  { id: 'px_cab_06', zone: 'cabine', tipo: 'CABINE', item: 'BUZINA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_cab_07', zone: 'cabine', tipo: 'CABINE', item: 'EXTINTOR', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_cab_08', zone: 'cabine', tipo: 'CABINE', item: 'PROTEÇÃO CONTRA SOL E TEMPERATURAS', classificacao: 'SEGURANÇA', gravidade: 'LEVE' },
  { id: 'px_cab_09', zone: 'cabine', tipo: 'CABINE', item: 'SENSOR DO CINTO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_cab_10', zone: 'cabine', tipo: 'CABINE', item: 'CINTO DE SEGURANÇA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_cab_11', zone: 'cabine', tipo: 'CABINE', item: 'PAINÉIS (FRONTAL E PORTA)', classificacao: 'QUALIDADE/SEGURANÇA', gravidade: 'LEVE/MÉDIO' },
  { id: 'px_cab_12', zone: 'cabine', tipo: 'CABINE', item: 'MAÇANETAS E FECHAMENTO DA PORTA', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO/BLOQUEIO IMEDIATO' },
  { id: 'px_cab_13', zone: 'cabine', tipo: 'CABINE', item: 'ESTRUTURA DO BANCO', classificacao: 'QUALIDADE', gravidade: 'MÉDIO' },
  { id: 'px_cab_14', zone: 'cabine', tipo: 'CABINE', item: 'LADO EXTERNO', classificacao: 'QUALIDADE', gravidade: 'LEVE/MÉDIO' },
  { id: 'px_cab_15', zone: 'cabine', tipo: 'CABINE', item: 'PONTOS DE APOIO DE ACESSO A CABINE', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/BLOQUEIO IMEDIATO' },

  // FRONTAL (12)
  { id: 'px_fro_01', zone: 'frontal', tipo: 'FRONTAL', item: 'FAROL', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_fro_02', zone: 'frontal', tipo: 'FRONTAL', item: 'FAROL', classificacao: 'QUALIDADE', gravidade: 'LEVE/GRAVE' },
  { id: 'px_fro_03', zone: 'frontal', tipo: 'FRONTAL', item: 'PISCA DIANTEIRO E AUXILIAR', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_fro_04', zone: 'frontal', tipo: 'FRONTAL', item: 'PISCA DIANTEIRO E AUXILIAR', classificacao: 'QUALIDADE', gravidade: 'LEVE/GRAVE' },
  { id: 'px_fro_05', zone: 'frontal', tipo: 'FRONTAL', item: 'PARA-CHOQUE DIANTEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE/GRAVE' },
  { id: 'px_fro_06', zone: 'frontal', tipo: 'FRONTAL', item: 'LIMPADOR', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_fro_07', zone: 'frontal', tipo: 'FRONTAL', item: 'VIDROS FRONTAIS E LATERAIS', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/BLOQUEIO IMEDIATO' },
  { id: 'px_fro_08', zone: 'frontal', tipo: 'FRONTAL', item: 'PLACA DO VEÍCULO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/BLOQUEIO IMEDIATO' },
  { id: 'px_fro_09', zone: 'frontal', tipo: 'FRONTAL', item: 'CÓDIGO DE IDENTIFICAÇÃO DO VEÍCULO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_fro_10', zone: 'frontal', tipo: 'FRONTAL', item: 'ADESIVOS E IDENTIFICAÇÃO DE TRÂNSITO OBRIGATÓRIOS', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'px_fro_11', zone: 'frontal', tipo: 'FRONTAL', item: 'RETROVISORES', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_fro_12', zone: 'frontal', tipo: 'FRONTAL', item: 'RETROVISORES', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // SIDER (17)
  { id: 'px_sid_01', zone: 'sider', tipo: 'SIDER', item: 'LONA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_sid_02', zone: 'sider', tipo: 'SIDER', item: 'TRAVA DA LONA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/ BLOQUEIO IMEDIATO' },
  { id: 'px_sid_03', zone: 'sider', tipo: 'SIDER', item: 'TELA DE AMARRAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_sid_04', zone: 'sider', tipo: 'SIDER', item: 'ESTRUTURA INTERNA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE/ BLOQUEIO IMEDIATO' },
  { id: 'px_sid_05', zone: 'sider', tipo: 'SIDER', item: 'LUZES VIGIAS', classificacao: 'SEGURANÇA/ QUALIDADE', gravidade: 'MÉDIO/ LEVE' },
  { id: 'px_sid_06', zone: 'sider', tipo: 'SIDER', item: 'BLOQUEIO DAS PLATAFORMAS', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_sid_07', zone: 'sider', tipo: 'SIDER', item: 'TRAVAS DAS LONAS', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_sid_08', zone: 'sider', tipo: 'SIDER', item: 'ANTICICLISTA/ ESTRIBO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO/ GRAVE' },
  { id: 'px_sid_09', zone: 'sider', tipo: 'SIDER', item: 'FAIXAS REFLETIVAS LATERAL', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_sid_10', zone: 'sider', tipo: 'SIDER', item: 'FAIXAS REFLETIVAS LATERAL', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_sid_11', zone: 'sider', tipo: 'SIDER', item: 'LEVANTA FIO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'px_sid_12', zone: 'sider', tipo: 'SIDER', item: 'LEVANTA FIO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_sid_13', zone: 'sider', tipo: 'SIDER', item: 'QUALIDADE VISUAL DO BAÚ', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_sid_14', zone: 'sider', tipo: 'SIDER', item: 'QUALIDADE ESTRUTURAL DO BAÚ (EXTERNA)', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'px_sid_15', zone: 'sider', tipo: 'SIDER', item: 'QUALIDADE ESTRUTURAL DO BAÚ (EXTERNA)', classificacao: 'QUALIDADE', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_sid_16', zone: 'sider', tipo: 'SIDER', item: 'GAVETA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_sid_17', zone: 'sider', tipo: 'SIDER', item: 'GAVETA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // PLATAFORMA ELEVATÓRIA (3)
  { id: 'px_pla_01', zone: 'plataforma', tipo: 'PLATAFORMA ELEVATÓRIA', item: 'ESTRUTURA/ HIDRÁULICO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_pla_02', zone: 'plataforma', tipo: 'PLATAFORMA ELEVATÓRIA', item: 'PAINEL DE CONTROLE', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_pla_03', zone: 'plataforma', tipo: 'PLATAFORMA ELEVATÓRIA', item: 'TRAVAS RAMPA ELEVATÓRIA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // TRASEIRA (20)
  { id: 'px_tra_01', zone: 'traseira', tipo: 'TRASEIRA', item: 'PARA-CHOQUE TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_tra_02', zone: 'traseira', tipo: 'TRASEIRA', item: 'PARA-CHOQUE TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'px_tra_03', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAROL TRASEIRO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_tra_04', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAROL TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_tra_05', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAROL TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'px_tra_06', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE RÉ E SINAL SONORO DE RÉ', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_tra_07', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE RÉ E SINAL SONORO DE RÉ', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_tra_08', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE RÉ E SINAL SONORO DE RÉ', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'px_tra_09', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE FREIO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_tra_10', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE FREIO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_tra_11', zone: 'traseira', tipo: 'TRASEIRA', item: 'LUZ DE FREIO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'px_tra_12', zone: 'traseira', tipo: 'TRASEIRA', item: 'PISCA TRASEIRO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_tra_13', zone: 'traseira', tipo: 'TRASEIRA', item: 'PISCA TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_tra_14', zone: 'traseira', tipo: 'TRASEIRA', item: 'PISCA TRASEIRO', classificacao: 'QUALIDADE', gravidade: 'GRAVE' },
  { id: 'px_tra_15', zone: 'traseira', tipo: 'TRASEIRA', item: 'PLACA TRASEIRA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_tra_16', zone: 'traseira', tipo: 'TRASEIRA', item: 'PLACA TRASEIRA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_tra_17', zone: 'traseira', tipo: 'TRASEIRA', item: 'CÓDIGO DE IDENTIFICAÇÃO', classificacao: 'QUALIDADE', gravidade: 'LEVE' },
  { id: 'px_tra_18', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAIXA REFLETIVA DO PARACHOQUE', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_tra_19', zone: 'traseira', tipo: 'TRASEIRA', item: 'FAIXA REFLETIVA DO PARACHOQUE', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_tra_20', zone: 'traseira', tipo: 'TRASEIRA', item: 'ADESIVOS OBRIGATÓRIOS DE SEGURANÇA', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },

  // PNEUS (3)
  { id: 'px_pne_01', zone: 'pneus', tipo: 'PNEUS', item: 'MILIMETRAGEM', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
  { id: 'px_pne_02', zone: 'pneus', tipo: 'PNEUS', item: 'ESTADO DE CONSERVAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'GRAVE' },
  { id: 'px_pne_03', zone: 'pneus', tipo: 'PNEUS', item: 'ESTADO DE CONSERVAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },

  // ITENS EXTRAS (3)
  { id: 'px_ext_01', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'KIT HIGIENIZAÇÃO', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO' },
  { id: 'px_ext_02', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'FIAÇÃO EXPOSTA', classificacao: 'SEGURANÇA', gravidade: 'MÉDIO/ GRAVE/ BLOQUEIO IMEDIATO' },
  { id: 'px_ext_03', zone: 'extras', tipo: 'ITENS EXTRAS', item: 'PALETEIRA', classificacao: 'SEGURANÇA', gravidade: 'BLOQUEIO IMEDIATO' },
];

export function createPuxadaAllOkMap(
  overrides: Record<string, BlitzItemStatus> = {}
): Record<string, BlitzItemStatus> {
  const map: Record<string, BlitzItemStatus> = {};
  for (const col of PUXADA_COLUMNS) {
    map[col.id] = overrides[col.id] ?? 'OK';
  }
  return map;
}

export function computePuxadaPercent(itemsMap: Record<string, BlitzItemStatus>): {
  percent: number;
  okCount: number;
  nokCount: number;
  naCount: number;
} {
  let okCount = 0;
  let nokCount = 0;
  let naCount = 0;

  for (const col of PUXADA_COLUMNS) {
    const st = itemsMap[col.id];
    if (st === 'OK') okCount += 1;
    else if (st === 'NOK') nokCount += 1;
    else if (st === 'NA') naCount += 1;
  }

  const applicable = okCount + nokCount;
  const percent = applicable === 0 ? 100 : Math.round((okCount / applicable) * 100);
  return { percent, okCount, nokCount, naCount };
}

const DEFAULT_PUXADA_PLATES = [
  'RLT5J44',
  'RLT5J54',
  'RLU3F59',
  'NPT1753',
  'OFH7150',
  'MOM7962',
];

export const PUXADA_SEED_ROWS: PuxadaCheckPayload[] = DEFAULT_PUXADA_PLATES.map(
  (plate) => {
    const items = createPuxadaAllOkMap();
    const { percent } = computePuxadaPercent(items);
    return {
      id: `px-seed-jan-${plate.toLowerCase()}`,
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

export function serializePuxadaRecord(payload: PuxadaCheckPayload): string {
  const json = JSON.stringify(payload);
  return `data:${PUXADA_MIME};base64,${encodeUtf8Base64(json)}`;
}

export function parsePuxadaRecord(
  dataUrl: string | undefined,
  fallbackId = ''
): PuxadaCheckPayload | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = dataUrl.slice(commaIdx + 1);
    const json = dataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<PuxadaCheckPayload>;
    if (!parsed.placa) return null;

    const cleanItems: Record<string, BlitzItemStatus> = {};
    if (parsed.items && typeof parsed.items === 'object') {
      for (const col of PUXADA_COLUMNS) {
        const val = parsed.items[col.id];
        if (val === 'OK' || val === 'NOK' || val === 'NA') {
          cleanItems[col.id] = val;
        } else {
          cleanItems[col.id] = 'OK';
        }
      }
    } else {
      for (const col of PUXADA_COLUMNS) {
        cleanItems[col.id] = 'OK';
      }
    }

    const validMonth: ComplianceMonth =
      BLITZ_MONTHS.find((m) => m.month === parsed.mes)?.month ??
      getCurrentComplianceMonth();

    const { percent } = computePuxadaPercent(cleanItems);

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
      items: cleanItems,
    };
  } catch {
    return null;
  }
}

export function buildPuxadaRecord(
  payload: PuxadaCheckPayload,
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const plateSlug = payload.placa.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'pux';
  const monthSlug = (PUXADA_MONTH_ABBR[payload.mes] ?? 'mes').toLowerCase();
  const safeId =
    payload.id.startsWith('px-') && !payload.id.startsWith('px-seed-')
      ? payload.id
      : `px-${monthSlug}-${plateSlug}-${Date.now().toString(36)}`;
  const normalizedPayload: PuxadaCheckPayload = { ...payload, id: safeId };
  const finalSerialized = serializePuxadaRecord(normalizedPayload);
  const stats = computePuxadaPercent(normalizedPayload.items);

  return {
    id: safeId,
    folder: 'PUXADA',
    subfolder: '',
    fileName: `PUXADA_${PUXADA_MONTH_ABBR[normalizedPayload.mes]}_${normalizedPayload.placa}`,
    fileType: PUXADA_MIME,
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
