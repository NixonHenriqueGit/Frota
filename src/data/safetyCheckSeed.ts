import {
  LegalizedDocumentRecord,
  SafetyCheckMonthKey,
  SafetyCheckOperation,
  SafetyCheckRowPayload,
} from '../types/fleet';

export const SAFETY_CHECK_MIME = 'application/vnd.pb-safety-check+json';

export const SAFETY_MONTH_COLUMNS: {
  key: SafetyCheckMonthKey;
  label: string;
  index: number;
}[] = [
  { key: 'jan', label: 'Jan', index: 1 },
  { key: 'fev', label: 'Fev', index: 2 },
  { key: 'mar', label: 'Mar', index: 3 },
  { key: 'abr', label: 'Abr', index: 4 },
  { key: 'mai', label: 'Mai', index: 5 },
  { key: 'jun', label: 'Jun', index: 6 },
  { key: 'jul', label: 'Jul', index: 7 },
  { key: 'ago', label: 'Ago', index: 8 },
  { key: 'set', label: 'Set', index: 9 },
  { key: 'out', label: 'Out', index: 10 },
  { key: 'nov', label: 'Nov', index: 11 },
  { key: 'dez', label: 'Dez', index: 12 },
];

export const SAFETY_OPERATIONS: {
  key: SafetyCheckOperation;
  label: string;
  blitzTabLabel: string;
}[] = [
  { key: 'ENTREGA', label: 'ENTREGA', blitzTabLabel: 'BLITZ DE ENTREGA' },
  { key: 'PUXADA', label: 'PUXADA', blitzTabLabel: 'BLITZ DE PUXADA' },
  { key: 'ARMAZÉM', label: 'ARMAZÉM', blitzTabLabel: 'BLITZ EMPILHADEIRA' },
];

export const SAFETY_CHECK_SEED_ROWS: SafetyCheckRowPayload[] = [
  // ENTREGA (16 placas)
  {
    id: 'cs-entrega-npr2601',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'NPR2601',
    months: { jan: 100, fev: 100, mar: 99, abr: 100, mai: 99, jun: 100, jul: 100, ago: 99 },
  },
  {
    id: 'cs-entrega-oxo0532',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'OXO0532',
    months: { jan: 99, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-oxo0542',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'OXO0542',
    months: { jan: 100, fev: 100, mar: 99, abr: 99, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-oxo0552',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'OXO0552',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 99, ago: 100 },
  },
  {
    id: 'cs-entrega-oxo0782',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'OXO0782',
    months: { jan: 100, fev: 99, mar: 100, abr: 100, mai: 100, jun: 99, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-qsk7d92',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'QSK7D92',
    months: { jan: 100, fev: 99, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-rlr8g79',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'RLR8G79',
    months: { jan: 100, fev: 100, mar: 98, abr: 100, mai: 99, jun: 100, jul: 99, ago: 100 },
  },
  {
    id: 'cs-entrega-rlu4h49',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'RLU4H49',
    months: { jan: 100, fev: 100, mar: 99, abr: 99, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-rlw0c17',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'RLW0C17',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 99, ago: 100 },
  },
  {
    id: 'cs-entrega-slb3j76',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'SLB3J76',
    months: { jan: 100, fev: 100, mar: 100, abr: 99, mai: 100, jun: 99, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-slb4a26',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'SLB4A26',
    months: { jan: 100, fev: 100, mar: 100, abr: 99, mai: 100, jun: 100, jul: 100, ago: 99 },
  },
  {
    id: 'cs-entrega-slb4a56',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'SLB4A56',
    months: { jan: 100, fev: 100, mar: 100, abr: 99, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-tou7f39',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'TOU7F39',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-toz8b20',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'TOZ8B20',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-entrega-toz8b50',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'TOZ8B50',
    months: { jan: 100, fev: 99, mar: 100, abr: 100, mai: 100, jun: 100, jul: 99, ago: 100 },
  },
  {
    id: 'cs-entrega-qfg1259',
    operation: 'ENTREGA',
    unit: 'GUARABIRA',
    plate: 'QFG1259',
    months: { jan: 100, fev: 99, mar: 99, abr: 100, mai: 99, jun: 99, jul: 100, ago: 100 },
  },

  // PUXADA (3 placas)
  {
    id: 'cs-puxada-rlt5j44',
    operation: 'PUXADA',
    unit: 'GUARABIRA',
    plate: 'RLT5J44',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-puxada-rlt5j54',
    operation: 'PUXADA',
    unit: 'GUARABIRA',
    plate: 'RLT5J54',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-puxada-rlu3f59',
    operation: 'PUXADA',
    unit: 'GUARABIRA',
    plate: 'RLU3F59',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },

  // ARMAZÉM (2 equipamentos)
  {
    id: 'cs-armazem-emp0008',
    operation: 'ARMAZÉM',
    unit: 'GUARABIRA',
    plate: 'EMP0008',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
  {
    id: 'cs-armazem-emp0016',
    operation: 'ARMAZÉM',
    unit: 'GUARABIRA',
    plate: 'EMP0016',
    months: { jan: 100, fev: 100, mar: 100, abr: 100, mai: 100, jun: 100, jul: 100, ago: 100 },
  },
];

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

export function serializeSafetyCheckRow(row: SafetyCheckRowPayload): string {
  const json = JSON.stringify(row);
  return `data:${SAFETY_CHECK_MIME};base64,${encodeUtf8Base64(json)}`;
}

export function parseSafetyCheckRow(
  dataUrl: string | undefined,
  fallback?: Partial<SafetyCheckRowPayload>
): SafetyCheckRowPayload | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const raw = dataUrl.slice(commaIdx + 1);
    const json = dataUrl.slice(0, commaIdx).includes(';base64')
      ? decodeUtf8Base64(raw)
      : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as Partial<SafetyCheckRowPayload>;
    const op: SafetyCheckOperation =
      parsed.operation === 'PUXADA' || parsed.operation === 'ARMAZÉM'
        ? parsed.operation
        : fallback?.operation ?? 'ENTREGA';
    const plate = String(parsed.plate ?? fallback?.plate ?? '').toUpperCase().trim();
    if (!plate) return null;
    const months: Partial<Record<SafetyCheckMonthKey, number | null>> = {};
    for (const col of SAFETY_MONTH_COLUMNS) {
      const val = parsed.months?.[col.key];
      if (typeof val === 'number' && Number.isFinite(val)) {
        months[col.key] = Math.max(0, Math.min(100, Math.round(val)));
      }
    }
    return {
      id: String(parsed.id ?? fallback?.id ?? ''),
      operation: op,
      unit: String(parsed.unit ?? fallback?.unit ?? 'GUARABIRA').toUpperCase().trim() || 'GUARABIRA',
      plate,
      months,
      notes: parsed.notes ? String(parsed.notes) : undefined,
    };
  } catch {
    return null;
  }
}

export function buildSafetyCheckRecord(
  row: SafetyCheckRowPayload,
  nowDate = new Date().toLocaleDateString('pt-BR')
): LegalizedDocumentRecord {
  const serialized = serializeSafetyCheckRow(row);
  const opSlug =
    row.operation === 'PUXADA'
      ? 'puxada'
      : row.operation === 'ARMAZÉM'
        ? 'armazem'
        : 'entrega';
  const plateSlug = row.plate.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'item';
  const safeId = row.id.startsWith('cs-') ? row.id : `cs-${opSlug}-${plateSlug}`;

  return {
    id: safeId,
    folder: 'CHECK DE SEGURANÇA',
    subfolder: '',
    fileName: `CS_${row.operation}_${row.plate}`,
    fileType: SAFETY_CHECK_MIME,
    fileSize: serialized.length,
    plate: row.plate.slice(0, 20),
    expiryDate: row.operation,
    referenceDate: row.unit.slice(0, 40),
    notes: (row.notes ?? '').slice(0, 500),
    uploadedAt: nowDate,
    fileDataUrl: serialized,
  };
}
