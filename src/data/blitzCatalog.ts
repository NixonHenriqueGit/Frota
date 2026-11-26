import {
  BlitzChecklistItemDef,
  BlitzInspectionPayload,
  BlitzItemStatus,
  BlitzKind,
  BlitzZoneDef,
  ComplianceMonth,
  LegalizedDocumentRecord,
  LegalizedFolderName,
  SafetyCheckOperation,
} from '../types/fleet';
import {
  BLITZ_ENTREGA_ITEMS,
  BLITZ_ENTREGA_MIME,
  BLITZ_MONTHS,
  BLITZ_ZONES as BLITZ_ENTREGA_ZONES,
  getCurrentComplianceMonth,
} from './blitzEntregaSeed';

export type BlitzMidColumnKey = 'Mapa:' | 'PLACA:' | 'Nome:' | 'CPF:';

export interface BlitzConfig {
  kind: BlitzKind;
  folder: LegalizedFolderName;
  idPrefix: 'be-' | 'bp-' | 'bm-';
  mime: string;
  title: string;
  subtitle: string;
  safetyOperation: SafetyCheckOperation;
  plateLabel: string;
  platePlaceholder: string;
  driverLabel: string;
  driverPlaceholder: string;
  hasMapa: boolean;
  midColumnsOrder: BlitzMidColumnKey[];
  midAfterItemCount: number;
  excelFileName: string;
  excelSheetName: string;
  zones: BlitzZoneDef[];
  items: BlitzChecklistItemDef[];
}

export const BLITZ_PUXADA_ZONES: BlitzZoneDef[] = [
  { key: 'cabine', label: '1. Cabine & Documentação', shortLabel: 'Cabine' },
  { key: 'frente', label: '2. Frente & Laterais', shortLabel: 'Frente' },
  { key: 'bau', label: '3. Carreta / Sider', shortLabel: 'Carreta' },
  { key: 'traseira', label: '4. Traseira', shortLabel: 'Traseira' },
  { key: 'pneus', label: '5. Pneus', shortLabel: 'Pneus' },
  { key: 'eletrica', label: '6. Higienização & Elétrica', shortLabel: 'Elétrica' },
];

export const BLITZ_PUXADA_ITEMS: BlitzChecklistItemDef[] = [
  // Cabine & Documentação (15)
  { id: 'pc_01', zone: 'cabine', label: '1- Documentos Obrigatórios' },
  { id: 'pc_03', zone: 'cabine', label: '3- Forro de Teto' },
  { id: 'pc_02', zone: 'cabine', label: '2- 5S' },
  { id: 'pc_04', zone: 'cabine', label: '4- Manopla' },
  { id: 'pc_05', zone: 'cabine', label: '5- Volante' },
  { id: 'pc_06', zone: 'cabine', label: '6- Buzina' },
  { id: 'pc_07', zone: 'cabine', label: '7-Extintor' },
  { id: 'pc_08', zone: 'cabine', label: '8-Proteção contra Sol e Temperaturas' },
  { id: 'pc_09', zone: 'cabine', label: '9-Sensor de Cinto' },
  { id: 'pc_10', zone: 'cabine', label: '10-Cinto de Segurança' },
  { id: 'pc_12', zone: 'cabine', label: '12-Maçanetas e fechamento da porta' },
  { id: 'pc_11', zone: 'cabine', label: '11-Painéis (Frontal e Porta)' },
  { id: 'pc_13', zone: 'cabine', label: '13-Estrutura do Banco' },
  { id: 'pc_15', zone: 'cabine', label: '15-Pontos de Apoio de Acesso a Cabine' },
  { id: 'pc_14', zone: 'cabine', label: '14-Lado Externo' },

  // Frente & Laterais (9)
  { id: 'pf_02', zone: 'frente', label: '2-Pisca Dianteiro e Auxiliar' },
  { id: 'pf_03', zone: 'frente', label: '3-Para-Choque Dianteiro' },
  { id: 'pf_04', zone: 'frente', label: '4-Limpador' },
  { id: 'pf_01', zone: 'frente', label: '1-Farol' },
  { id: 'pf_06', zone: 'frente', label: '6-Placa do Veículo' },
  { id: 'pf_05', zone: 'frente', label: '5-Vidros Frontais e Laterais' },
  { id: 'pf_07', zone: 'frente', label: '7-Código de Identificação do Veículo' },
  { id: 'pf_08', zone: 'frente', label: '8-Adesivos e Identificação de Trânsito Obrigatórios' },
  { id: 'pf_09', zone: 'frente', label: '9-Retrovisores' },

  // Carreta / Sider (13)
  { id: 'pb_02', zone: 'bau', label: '2-Trava das Lonas' },
  { id: 'pb_01', zone: 'bau', label: '1-Lona' },
  { id: 'pb_03', zone: 'bau', label: '3-Tela de Amarração' },
  { id: 'pb_04', zone: 'bau', label: '4-Estrutura Interna Sider' },
  { id: 'pb_05', zone: 'bau', label: '5-Luzes Vigia' },
  { id: 'pb_06', zone: 'bau', label: '6-Bloqueio' },
  { id: 'pb_07', zone: 'bau', label: '7-Trava Rampa Elevatória' },
  { id: 'pb_08', zone: 'bau', label: '8-Anticiclista/Estribo' },
  { id: 'pb_09', zone: 'bau', label: '9-Faixas Refletiva Lateral' },
  { id: 'pb_10', zone: 'bau', label: '10-Levanta Fio' },
  { id: 'pb_11', zone: 'bau', label: '11-Qualidade Visual' },
  { id: 'pb_12', zone: 'bau', label: '12-Estrutura Rampa / Carroceria' },
  { id: 'pb_13', zone: 'bau', label: '13-Cofre' },

  // Traseira (9)
  { id: 'pt_01', zone: 'traseira', label: '1-Para-Choque Traseiro' },
  { id: 'pt_02', zone: 'traseira', label: '2-Farol Traseiro' },
  { id: 'pt_03', zone: 'traseira', label: '3-Luz de Ré e Sinal Sonoro de Ré' },
  { id: 'pt_04', zone: 'traseira', label: '4-Luz de Freio' },
  { id: 'pt_05', zone: 'traseira', label: '5-Pisca Traseiro' },
  { id: 'pt_06', zone: 'traseira', label: '6-Placa Traseira' },
  { id: 'pt_07', zone: 'traseira', label: '7-Código de Identificação' },
  { id: 'pt_08', zone: 'traseira', label: '8-Faixa Refletiva do Para-Choque' },
  { id: 'pt_09', zone: 'traseira', label: '9-Adesivos Obrigatórios de Segurança' },

  // Pneus (2)
  { id: 'pp_01', zone: 'pneus', label: '1-Milimetragem' },
  { id: 'pp_02', zone: 'pneus', label: '2-Estado de Conservação' },

  // Higienização & Elétrica (4)
  { id: 'pe_01', zone: 'eletrica', label: '1-Kit Higienização' },
  { id: 'pe_02', zone: 'eletrica', label: '2-Fiação Exposta' },
  { id: 'pe_03', zone: 'eletrica', label: '3-Proteção das Baterias' },
  { id: 'pe_04', zone: 'eletrica', label: '4-Prateleira' },
];

export const BLITZ_EMPILHADEIRA_ZONES: BlitzZoneDef[] = [
  { key: 'cabine', label: '1. Segurança & Cabine', shortLabel: 'Segurança' },
  { key: 'torre', label: '2. Torre & Garfos', shortLabel: 'Torre' },
  { key: 'sinalizacao', label: '3. Sinalização & Alarmes', shortLabel: 'Sinalização' },
  { key: 'pneus', label: '4. Pneus & Rodas', shortLabel: 'Pneus' },
  { key: 'bau', label: '5. Visual, Retrovisores & 5S', shortLabel: 'Visual / 5S' },
  { key: 'eletrica', label: '6. Higienização, Elétrica & Tara', shortLabel: 'Elétrica' },
];

export const BLITZ_EMPILHADEIRA_ITEMS: BlitzChecklistItemDef[] = [
  // Segurança & Cabine (11)
  { id: 'mc_01', zone: 'cabine', label: '1-Cinto de Segurança' },
  { id: 'mc_02', zone: 'cabine', label: '2-Sensor de Cinto' },
  { id: 'mc_03', zone: 'cabine', label: '3-Extintor' },
  { id: 'mc_04', zone: 'cabine', label: '4-Blue Spot' },
  { id: 'mc_05', zone: 'cabine', label: '5-Leds Laterais' },
  { id: 'mc_06', zone: 'cabine', label: '6-Limitador de Velocidade' },
  { id: 'mc_07', zone: 'cabine', label: '7-Para-brisa / Proteção de Vidro' },
  { id: 'mc_08', zone: 'cabine', label: '8-Proteção Emborrachada' },
  { id: 'mc_09', zone: 'cabine', label: '9-Grade Protetora' },
  { id: 'mc_10', zone: 'cabine', label: '10-Cilindro GLP' },
  { id: 'mc_11', zone: 'cabine', label: '11-Pontos de Acesso à Cabine' },

  // Torre & Garfos (5)
  { id: 'mt_01', zone: 'torre', label: '1-Altura da Torre' },
  { id: 'mt_02', zone: 'torre', label: '2-Garfo Hidráulico' },
  { id: 'mt_03', zone: 'torre', label: '3-Torre' },
  { id: 'mt_04', zone: 'torre', label: '4-Proteção Emborrachada dos Garfos' },
  { id: 'mt_05', zone: 'torre', label: '5-Vazamento Hidráulico' },

  // Sinalização & Alarmes (6)
  { id: 'ms_01', zone: 'sinalizacao', label: '1-Farolete Dianteiro' },
  { id: 'ms_02', zone: 'sinalizacao', label: '2-Buzina (Volante)' },
  { id: 'ms_03', zone: 'sinalizacao', label: '3-Buzina (Alça Traseira)' },
  { id: 'ms_04', zone: 'sinalizacao', label: '4-Luz de Ré e Freio' },
  { id: 'ms_05', zone: 'sinalizacao', label: '5-Sirene de Ré' },
  { id: 'ms_06', zone: 'sinalizacao', label: '6-Farolete Traseiro' },

  // Pneus & Rodas (2)
  { id: 'mp_01', zone: 'pneus', label: '1-Pneus' },
  { id: 'mp_02', zone: 'pneus', label: '2-Rodas' },

  // Visual, Retrovisores & 5S (9)
  { id: 'mv_01', zone: 'bau', label: '1-Lavador' },
  { id: 'mv_02', zone: 'bau', label: '2-Alça Traseira' },
  { id: 'mv_03', zone: 'bau', label: '3-Espelho Panorâmico' },
  { id: 'mv_04', zone: 'bau', label: '4-Retrovisores' },
  { id: 'mv_05', zone: 'bau', label: '5-Volante' },
  { id: 'mv_06', zone: 'bau', label: '6-Faixas Refletivas' },
  { id: 'mv_07', zone: 'bau', label: '7-Bancos' },
  { id: 'mv_08', zone: 'bau', label: '8-Qualidade Visual' },
  { id: 'mv_09', zone: 'bau', label: '9-5S' },

  // Higienização, Elétrica & Tara (3)
  { id: 'me_01', zone: 'eletrica', label: '1-kit Covid / Higienização' },
  { id: 'me_02', zone: 'eletrica', label: '2-Fiação Exposta' },
  { id: 'me_03', zone: 'eletrica', label: '3-Tara Máxima' },
];

export const BLITZ_CATALOG: Record<BlitzKind, BlitzConfig> = {
  entrega: {
    kind: 'entrega',
    folder: 'BLITZ DE ENTREGA',
    idPrefix: 'be-',
    mime: BLITZ_ENTREGA_MIME,
    title: 'BLITZ DE ENTREGA',
    subtitle:
      'Inspeção rápida de 55 itens por zona — já inicia com Tudo OK para marcar só as exceções.',
    safetyOperation: 'ENTREGA',
    plateLabel: 'PLACA *',
    platePlaceholder: 'NPR2601',
    driverLabel: 'Nome (Motorista)',
    driverPlaceholder: 'Motorista',
    hasMapa: true,
    midColumnsOrder: ['Mapa:', 'PLACA:', 'Nome:', 'CPF:'],
    midAfterItemCount: 41,
    excelFileName: '1.2.3_Blitz_de_Entrega.xlsx',
    excelSheetName: 'BLITZ DE ENTREGA',
    zones: BLITZ_ENTREGA_ZONES,
    items: BLITZ_ENTREGA_ITEMS,
  },
  puxada: {
    kind: 'puxada',
    folder: 'BLITZ DE PUXADA',
    idPrefix: 'bp-',
    mime: 'application/vnd.pb-blitz-puxada+json',
    title: 'BLITZ DE PUXADA',
    subtitle:
      'Inspeção rápida de 52 itens (Cabine, Frente, Carreta/Sider, Traseira, Pneus e Elétrica) — inicia Tudo OK.',
    safetyOperation: 'PUXADA',
    plateLabel: 'PLACA *',
    platePlaceholder: 'RLT5J44',
    driverLabel: 'Nome (Motorista)',
    driverPlaceholder: 'Motorista',
    hasMapa: false,
    midColumnsOrder: ['PLACA:', 'Nome:', 'CPF:'],
    midAfterItemCount: 37,
    excelFileName: '1.2.3_Blitz_de_Puxada.xlsx',
    excelSheetName: 'BLITZ DE PUXADA',
    zones: BLITZ_PUXADA_ZONES,
    items: BLITZ_PUXADA_ITEMS,
  },
  empilhadeira: {
    kind: 'empilhadeira',
    folder: 'BLITZ EMPILHADEIRA',
    idPrefix: 'bm-',
    mime: 'application/vnd.pb-blitz-empilhadeira+json',
    title: 'BLITZ EMPILHADEIRA',
    subtitle:
      'Inspeção rápida de 36 itens (Segurança, Torre/Garfos, Sinalização, Pneus/Rodas, Visual e Elétrica) — inicia Tudo OK.',
    safetyOperation: 'ARMAZÉM',
    plateLabel: 'PLACA / Código *',
    platePlaceholder: 'EMP0008',
    driverLabel: 'Nome (Operador)',
    driverPlaceholder: 'Operador',
    hasMapa: false,
    midColumnsOrder: ['Nome:', 'CPF:', 'PLACA:'],
    midAfterItemCount: 33,
    excelFileName: '1.2.3_Blitz_Empilhadeira.xlsx',
    excelSheetName: 'BLITZ EMPILHADEIRA',
    zones: BLITZ_EMPILHADEIRA_ZONES,
    items: BLITZ_EMPILHADEIRA_ITEMS,
  },
};

export function computeBlitzPercentForItems(
  itemsList: BlitzChecklistItemDef[],
  itemsMap: Record<string, BlitzItemStatus>
): {
  percent: number;
  okCount: number;
  nokCount: number;
  naCount: number;
  answeredCount: number;
} {
  let okCount = 0;
  let nokCount = 0;
  let naCount = 0;

  for (const def of itemsList) {
    const st = itemsMap[def.id];
    if (st === 'OK') okCount += 1;
    else if (st === 'NOK') nokCount += 1;
    else if (st === 'NA') naCount += 1;
  }

  const applicable = okCount + nokCount;
  const percent = applicable === 0 ? 100 : Math.round((okCount / applicable) * 100);
  return {
    percent,
    okCount,
    nokCount,
    naCount,
    answeredCount: okCount + nokCount + naCount,
  };
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

export function serializeBlitzRecord(
  config: BlitzConfig,
  payload: BlitzInspectionPayload
): string {
  const json = JSON.stringify(payload);
  return `data:${config.mime};base64,${encodeUtf8Base64(json)}`;
}

export function parseBlitzRecord(
  config: BlitzConfig,
  dataUrl: string | undefined,
  fallbackId = ''
): BlitzInspectionPayload | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = dataUrl.slice(commaIdx + 1);
    const json = dataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<BlitzInspectionPayload>;
    if (!parsed.placa) return null;

    const cleanItems: Record<string, BlitzItemStatus> = {};
    if (parsed.items && typeof parsed.items === 'object') {
      for (const def of config.items) {
        const val = parsed.items[def.id];
        if (val === 'OK' || val === 'NOK' || val === 'NA') {
          cleanItems[def.id] = val;
        }
      }
    }

    const validMonth: ComplianceMonth =
      BLITZ_MONTHS.find((m) => m.month === parsed.mes)?.month ??
      getCurrentComplianceMonth();

    const { percent } = computeBlitzPercentForItems(config.items, cleanItems);

    return {
      id: String(parsed.id ?? fallbackId),
      displayId: String(parsed.displayId ?? ''),
      mes: validMonth,
      criador: String(parsed.criador ?? ''),
      data: String(parsed.data ?? ''),
      hora: String(parsed.hora ?? ''),
      percentual:
        typeof parsed.percentual === 'number' && Number.isFinite(parsed.percentual)
          ? Math.max(0, Math.min(100, Math.round(parsed.percentual)))
          : percent,
      mapa: String(parsed.mapa ?? ''),
      placa: String(parsed.placa ?? '').toUpperCase().trim(),
      nome: String(parsed.nome ?? ''),
      cpf: String(parsed.cpf ?? ''),
      items: cleanItems,
    };
  } catch {
    return null;
  }
}

export function buildBlitzRecord(
  config: BlitzConfig,
  payload: BlitzInspectionPayload,
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const plateSlug = payload.placa.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'veic';
  const safeId = payload.id.startsWith(config.idPrefix)
    ? payload.id
    : `${config.idPrefix}${plateSlug}-${Date.now().toString(36)}`;
  const normalizedPayload: BlitzInspectionPayload = { ...payload, id: safeId };
  const finalSerialized = serializeBlitzRecord(config, normalizedPayload);
  const stats = computeBlitzPercentForItems(config.items, normalizedPayload.items);

  return {
    id: safeId,
    folder: config.folder,
    subfolder: '',
    fileName: `${config.excelSheetName.replace(/\s+/g, '_')}_${normalizedPayload.placa}_${normalizedPayload.mes}`,
    fileType: config.mime,
    fileSize: finalSerialized.length,
    plate: normalizedPayload.placa.slice(0, 20),
    expiryDate: normalizedPayload.mes,
    referenceDate: normalizedPayload.data.slice(0, 40),
    notes: `${normalizedPayload.percentual}% (${stats.nokCount} NOK) · ${normalizedPayload.criador}`.slice(
      0,
      500
    ),
    uploadedAt: nowDate,
    fileDataUrl: finalSerialized,
  };
}
