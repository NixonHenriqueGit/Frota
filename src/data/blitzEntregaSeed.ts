import {
  BlitzEntregaItemDef,
  BlitzEntregaPayload,
  BlitzItemStatus,
  BlitzZoneKey,
  ComplianceMonth,
  LegalizedDocumentRecord,
  SafetyCheckMonthKey,
} from '../types/fleet';

export const BLITZ_ENTREGA_MIME = 'application/vnd.pb-blitz-entrega+json';

export const BLITZ_ZONES: {
  key: BlitzZoneKey;
  label: string;
  shortLabel: string;
}[] = [
  { key: 'cabine', label: '1. Cabine & Documentação', shortLabel: 'Cabine' },
  { key: 'frente', label: '2. Frente & Laterais', shortLabel: 'Frente' },
  { key: 'bau', label: '3. Baú & Carroceria', shortLabel: 'Baú' },
  { key: 'traseira', label: '4. Traseira', shortLabel: 'Traseira' },
  { key: 'pneus', label: '5. Pneus', shortLabel: 'Pneus' },
  { key: 'eletrica', label: '6. Higienização & Elétrica', shortLabel: 'Elétrica' },
];

export const BLITZ_ENTREGA_ITEMS: BlitzEntregaItemDef[] = [
  // Cabine & Documentação (15)
  { id: 'c_01', zone: 'cabine', label: '1- Documentos Obrigatórios' },
  { id: 'c_02', zone: 'cabine', label: '2- 5S' },
  { id: 'c_03', zone: 'cabine', label: '3- Forro de Teto' },
  { id: 'c_04', zone: 'cabine', label: '4- Manopla' },
  { id: 'c_05', zone: 'cabine', label: '5- Volante' },
  { id: 'c_06', zone: 'cabine', label: '6- Buzina' },
  { id: 'c_07', zone: 'cabine', label: '7-Extintor' },
  { id: 'c_08', zone: 'cabine', label: '8-Proteção contra Sol e Temperaturas' },
  { id: 'c_09', zone: 'cabine', label: '9-Sensor de Cinto' },
  { id: 'c_10', zone: 'cabine', label: '10-Sinto de Segurança' },
  { id: 'c_11', zone: 'cabine', label: '11-Painéis (Frontal e Porta)' },
  { id: 'c_12', zone: 'cabine', label: '12-Maçanetas e fechamento da porta' },
  { id: 'c_13', zone: 'cabine', label: '13-Estrutura do Banco' },
  { id: 'c_14', zone: 'cabine', label: '14-Lado Externo' },
  { id: 'c_15', zone: 'cabine', label: '15-Pontos de Apoio de Acesso a Cabine' },

  // Frente & Laterais (9)
  { id: 'f_02', zone: 'frente', label: '2-Pisca Dianteiro e Auxiliar' },
  { id: 'f_03', zone: 'frente', label: '3-Para-Choque Dianteiro' },
  { id: 'f_04', zone: 'frente', label: '4-Limpador' },
  { id: 'f_01', zone: 'frente', label: '1-Farol' },
  { id: 'f_05', zone: 'frente', label: '5-Vidros Frontais e Laterais' },
  { id: 'f_06', zone: 'frente', label: '6-Placa do Veículo' },
  { id: 'f_07', zone: 'frente', label: '7-Código de Identificação do Veículo' },
  { id: 'f_08', zone: 'frente', label: '8-Adesivos e Identificação de Trânsito Obrigatórios' },
  { id: 'f_09', zone: 'frente', label: '9-Retrovisores' },

  // Baú & Carroceria (17)
  { id: 'b_02', zone: 'bau', label: '2- Alça Pega Mão' },
  { id: 'b_01', zone: 'bau', label: '1- Puxador de Baia' },
  { id: 'b_03', zone: 'bau', label: '3-Plataforma' },
  { id: 'b_04', zone: 'bau', label: '4-Kit Ergonômico' },
  { id: 'b_05', zone: 'bau', label: '5-Iluminação' },
  { id: 'b_06', zone: 'bau', label: '6-Limpeza' },
  { id: 'b_07', zone: 'bau', label: '7-Baia Cortina' },
  { id: 'b_08', zone: 'bau', label: '8-Borracha da Baia' },
  { id: 'b_09', zone: 'bau', label: '9- Anti Guilhotina' },
  { id: 'b_10', zone: 'bau', label: '10-Luzes Vigia' },
  { id: 'b_11', zone: 'bau', label: '11-Anticiclista/Estribo' },
  { id: 'b_12', zone: 'bau', label: '12-Adesivo de Autoridade de Trânsito Competente' },
  { id: 'b_13', zone: 'bau', label: '13-Faixas Refletiva Lateral' },
  { id: 'b_14', zone: 'bau', label: '14-Levanta Fio' },
  { id: 'b_15', zone: 'bau', label: '15-Qualidade Visual do Baú' },
  { id: 'b_16', zone: 'bau', label: '16-Qualidade Estrutural do Baú (Interna e Externa)' },
  { id: 'b_17', zone: 'bau', label: '17- Cofre' },

  // Traseira (9)
  { id: 't_01', zone: 'traseira', label: '1-Para-Choque Traseiro' },
  { id: 't_02', zone: 'traseira', label: '2-Farol Traseiro' },
  { id: 't_03', zone: 'traseira', label: '3-Luz de Ré e Sinal Sonoro de Ré' },
  { id: 't_04', zone: 'traseira', label: '4-Luz de Freio' },
  { id: 't_05', zone: 'traseira', label: '5-Pisca Traseiro' },
  { id: 't_06', zone: 'traseira', label: '6-Placa Traseira' },
  { id: 't_07', zone: 'traseira', label: '7-Código de Identificação' },
  { id: 't_08', zone: 'traseira', label: '8-Faixa Refletiva do Para-Choque' },
  { id: 't_09', zone: 'traseira', label: '9-Adesivos Obrigatórios de Segurança' },

  // Pneus (2)
  { id: 'p_01', zone: 'pneus', label: '1-Milimetragem' },
  { id: 'p_02', zone: 'pneus', label: '2-Estado de Conservação' },

  // Higienização & Elétrica (3)
  { id: 'e_01', zone: 'eletrica', label: '1-Kit Higienização' },
  { id: 'e_02', zone: 'eletrica', label: '2-Fiação Exposta' },
  { id: 'e_03', zone: 'eletrica', label: '3-Proteção das Baterias' },
];

export const BLITZ_MONTHS: { month: ComplianceMonth; safetyKey: SafetyCheckMonthKey }[] = [
  { month: 'JANEIRO', safetyKey: 'jan' },
  { month: 'FEVEREIRO', safetyKey: 'fev' },
  { month: 'MARÇO', safetyKey: 'mar' },
  { month: 'ABRIL', safetyKey: 'abr' },
  { month: 'MAIO', safetyKey: 'mai' },
  { month: 'JUNHO', safetyKey: 'jun' },
  { month: 'JULHO', safetyKey: 'jul' },
  { month: 'AGOSTO', safetyKey: 'ago' },
  { month: 'SETEMBRO', safetyKey: 'set' },
  { month: 'OUTUBRO', safetyKey: 'out' },
  { month: 'NOVEMBRO', safetyKey: 'nov' },
  { month: 'DEZEMBRO', safetyKey: 'dez' },
];

export function monthToSafetyKey(mes: ComplianceMonth): SafetyCheckMonthKey {
  return BLITZ_MONTHS.find((m) => m.month === mes)?.safetyKey ?? 'jan';
}

export function getCurrentComplianceMonth(): ComplianceMonth {
  const idx = new Date().getMonth();
  return BLITZ_MONTHS[idx]?.month ?? 'JANEIRO';
}

export function computeBlitzPercent(items: Record<string, BlitzItemStatus>): {
  percent: number;
  okCount: number;
  nokCount: number;
  naCount: number;
  answeredCount: number;
} {
  let okCount = 0;
  let nokCount = 0;
  let naCount = 0;

  for (const def of BLITZ_ENTREGA_ITEMS) {
    const st = items[def.id];
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

export function serializeBlitzEntrega(payload: BlitzEntregaPayload): string {
  const json = JSON.stringify(payload);
  return `data:${BLITZ_ENTREGA_MIME};base64,${encodeUtf8Base64(json)}`;
}

export function parseBlitzEntrega(
  dataUrl: string | undefined,
  fallbackId = ''
): BlitzEntregaPayload | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = dataUrl.slice(commaIdx + 1);
    const json = dataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<BlitzEntregaPayload>;
    if (!parsed.placa) return null;

    const cleanItems: Record<string, BlitzItemStatus> = {};
    if (parsed.items && typeof parsed.items === 'object') {
      for (const def of BLITZ_ENTREGA_ITEMS) {
        const val = parsed.items[def.id];
        if (val === 'OK' || val === 'NOK' || val === 'NA') {
          cleanItems[def.id] = val;
        }
      }
    }

    const validMonth =
      BLITZ_MONTHS.find((m) => m.month === parsed.mes)?.month ??
      getCurrentComplianceMonth();

    const { percent } = computeBlitzPercent(cleanItems);

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

export function buildBlitzEntregaRecord(
  payload: BlitzEntregaPayload,
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const serialized = serializeBlitzEntrega(payload);
  const plateSlug = payload.placa.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'veic';
  const safeId = payload.id.startsWith('be-')
    ? payload.id
    : `be-${plateSlug}-${Date.now().toString(36)}`;
  const normalizedPayload: BlitzEntregaPayload = { ...payload, id: safeId };
  const finalSerialized = serializeBlitzEntrega(normalizedPayload);
  const stats = computeBlitzPercent(normalizedPayload.items);

  return {
    id: safeId,
    folder: 'BLITZ DE ENTREGA',
    subfolder: '',
    fileName: `BLITZ_${normalizedPayload.placa}_${normalizedPayload.mes}`,
    fileType: BLITZ_ENTREGA_MIME,
    fileSize: finalSerialized.length || serialized.length,
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
