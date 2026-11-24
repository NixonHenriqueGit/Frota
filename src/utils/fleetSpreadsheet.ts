import * as XLSX from 'xlsx';
import { resolveVehiclePhoto } from '../data/fleetSeed';
import {
  ChecklistKey,
  Company,
  DocumentStatus,
  DocumentType,
  OwnershipType,
  Sector,
  Vehicle,
  VehicleCategory,
  VehicleDocumentRecord,
  VehicleEvidenceRecord,
  VehicleStatus,
} from '../types/fleet';

export const SPREADSHEET_HEADERS = [
  'PLACA',
  'EMPRESA',
  'Nº FROTA',
  'COD.TIPO',
  'STATUS',
  'SETOR',
  'TIPO',
  'MODELO',
  'Nº EIXOS',
  'PRÓPRIO OU TERCEIRO',
  'FABRICANTE',
  'ANO FABRICAÇÃO',
  'ANO MODELO',
  'COR',
  'LOGOMARCA',
  'ANO OPERAÇÃO',
  'KM/HORAS ATUAL',
  'CARROCERIA',
  'TARA',
  'PBT',
  'RENAVAM',
  'CHASSIS',
  'VENCIMENTO CRLV',
  'VENCIMENTO IPVA',
  'VENCIMENTO ANTT',
  'VENCIMENTO CNT',
  'VENCIMENTO ALVARÁ VIGILÂNCIA SANITÁRIA',
  'VENCIMENTO EXTINTOR',
  'VENCIMENTO CRONOTACÓGRAFO',
  'Nº SÉRIE EXTINTOR',
  'VALOR TABELA FIPE (NOVO)',
  'VALOR ATUAL',
  'CAPACIDADE DO TANQUE COMB',
  'COMBUSTÍVEL',
  'CAPACIDADE (Pallets)',
  'CAPACIDADE CAIXAS / PESO',
  'STATUS2',
  'HB FROTA',
  'Macaco',
  'Chave de roda',
  'Cabo de força',
  'Pino cambão',
  'Triângulo',
  'Extintor',
  'Cone',
  'Tacógrafo',
  'Step',
  'Pneus',
  'Plataforma',
  'Estribo',
  'Kit Ergonômico',
  'Sensor de cinto',
  'IDADE FROTA EM ANOS',
  'PRAZO PARA TROCA EM ANOS',
  'PRAZO PARA TROCA EM KM/HORA',
  'MÊS / ANO PREVISTO PARA TROCA',
  'ANO COMPRA',
  'IDADE FROTA ANO / MESES',
  'COD. FIPE',
  'STATUS',
] as const;

type MappedField =
  | 'plate'
  | 'company'
  | 'fleetNumber'
  | 'typeCode'
  | 'status'
  | 'sector'
  | 'category'
  | 'model'
  | 'axles'
  | 'ownership'
  | 'manufacturer'
  | 'yearFab'
  | 'yearMod'
  | 'color'
  | 'logoBrand'
  | 'operationYear'
  | 'kmOrHours'
  | 'bodywork'
  | 'tare'
  | 'pbt'
  | 'renavam'
  | 'chassi'
  | 'expCrlv'
  | 'expIpva'
  | 'expAntt'
  | 'expCnt'
  | 'expAlvara'
  | 'expExtintor'
  | 'expCrono'
  | 'extinguisherSerial'
  | 'fipeValue'
  | 'currentValue'
  | 'tankCapacity'
  | 'fuelType'
  | 'capacityPallets'
  | 'cargoCapacity'
  | 'status2'
  | 'hbFrota'
  | 'fleetAgeYears'
  | 'replacementTermYears'
  | 'replacementTermKmHours'
  | 'expectedReplacementMonthYear'
  | 'purchaseYear'
  | 'fleetAgeYearMonths'
  | 'fipeCode'
  | 'finalStatus'
  | `chk:${ChecklistKey}`;

interface CellData {
  raw: unknown;
  text: string;
}

export interface ParsedFleetImport {
  vehicles: Vehicle[];
  matchedColumns: string[];
  unrecognizedColumns: string[];
  skippedRows: number;
  duplicatePlates: string[];
  sheetName: string;
  availableSheets: string[];
}

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, 'O')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function normalizeValue(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
}

function cellText(cell: CellData | undefined): string {
  if (!cell) return '';
  return cell.text || cleanString(cell.raw);
}

function mapHeaderToField(
  normalized: string,
  seenOperationalStatus: boolean
): MappedField | null {
  if (!normalized) return null;

  // Duplicate STATUS column: first goes to operational status, subsequent goes to finalStatus
  if (normalized === 'STATUS') {
    return seenOperationalStatus ? 'finalStatus' : 'status';
  }
  if (normalized === 'STATUS 2' || normalized === 'STATUS2') return 'status2';
  if (normalized === 'STATUS FINAL' || normalized === 'STATUS TROCA') return 'finalStatus';

  if (
    normalized === 'PLACA' ||
    normalized === 'PLACA VEICULO' ||
    normalized === 'PLACA DO VEICULO'
  ) {
    return 'plate';
  }
  if (
    normalized === 'EMPRESA' ||
    normalized === 'FILIAL' ||
    normalized === 'UNIDADE'
  ) {
    return 'company';
  }
  if (
    normalized === 'NO FROTA' ||
    normalized === 'N FROTA' ||
    normalized === 'N DO FROTA' ||
    normalized === 'NUMERO FROTA' ||
    normalized === 'NUMERO DA FROTA' ||
    normalized === 'COD FROTA' ||
    normalized === 'CODIGO FROTA' ||
    normalized === 'FROTA' ||
    normalized === 'PREFIXO'
  ) {
    return 'fleetNumber';
  }
  if (normalized === 'COD TIPO' || normalized === 'CODIGO TIPO') return 'typeCode';
  if (
    normalized === 'SETOR' ||
    normalized === 'AREA' ||
    normalized === 'DEPARTAMENTO'
  ) {
    return 'sector';
  }
  if (
    normalized === 'TIPO' ||
    normalized === 'TIPO VEICULO' ||
    normalized === 'TIPO DE VEICULO' ||
    normalized === 'CATEGORIA'
  ) {
    return 'category';
  }
  if (
    normalized === 'MODELO' ||
    normalized === 'MODELO VEICULO' ||
    normalized === 'DESCRICAO'
  ) {
    return 'model';
  }
  if (
    normalized === 'NO EIXOS' ||
    normalized === 'N EIXOS' ||
    normalized === 'EIXOS'
  ) {
    return 'axles';
  }
  if (
    normalized === 'PROPRIO OU TERCEIRO' ||
    normalized === 'PROPRIO TERCEIRO' ||
    normalized === 'PROPRIEDADE' ||
    normalized === 'PROPRIETARIO'
  ) {
    return 'ownership';
  }
  if (normalized === 'FABRICANTE' || normalized === 'MARCA') return 'manufacturer';
  if (normalized === 'ANO FABRICACAO' || normalized === 'ANO FAB') return 'yearFab';
  if (normalized === 'ANO MODELO' || normalized === 'ANO MOD') return 'yearMod';
  if (normalized === 'COR') return 'color';
  if (normalized === 'LOGOMARCA') return 'logoBrand';
  if (normalized === 'ANO OPERACAO' || normalized === 'INICIO OPERACAO') {
    return 'operationYear';
  }
  if (
    normalized === 'KM HORAS ATUAL' ||
    normalized === 'KM ATUAL' ||
    normalized === 'HORAS ATUAL' ||
    normalized === 'KM HORAS' ||
    normalized === 'KM H' ||
    normalized === 'HODOMETRO' ||
    normalized === 'ODOMETRO' ||
    normalized === 'HORIMETRO' ||
    normalized === 'KM'
  ) {
    return 'kmOrHours';
  }
  if (normalized === 'CARROCERIA') return 'bodywork';
  if (normalized === 'TARA') return 'tare';
  if (normalized === 'PBT') return 'pbt';
  if (normalized === 'RENAVAM') return 'renavam';
  if (normalized === 'CHASSIS' || normalized === 'CHASSI') return 'chassi';

  // Expirations & Extinguisher serial (must come before checklist 'EXTINTOR')
  if (
    normalized === 'VENCIMENTO CRLV' ||
    normalized === 'VENC CRLV' ||
    normalized === 'VALIDADE CRLV' ||
    normalized === 'CRLV'
  ) {
    return 'expCrlv';
  }
  if (
    normalized === 'VENCIMENTO IPVA' ||
    normalized === 'VENC IPVA' ||
    normalized === 'VALIDADE IPVA' ||
    normalized === 'IPVA'
  ) {
    return 'expIpva';
  }
  if (
    normalized === 'VENCIMENTO ANTT' ||
    normalized === 'VENC ANTT' ||
    normalized === 'VALIDADE ANTT' ||
    normalized === 'ANTT' ||
    normalized === 'RNTRC'
  ) {
    return 'expAntt';
  }
  if (
    normalized === 'VENCIMENTO CNT' ||
    normalized === 'VENC CNT' ||
    normalized === 'VALIDADE CNT' ||
    normalized === 'CNT'
  ) {
    return 'expCnt';
  }
  if (
    normalized.includes('ALVARA') ||
    normalized.includes('VIGILANCIA') ||
    normalized.includes('VIGILANICA')
  ) {
    return 'expAlvara';
  }
  if (
    normalized === 'VENCIMENTO EXTINTOR' ||
    normalized === 'VENC EXTINTOR' ||
    normalized === 'VALIDADE EXTINTOR'
  ) {
    return 'expExtintor';
  }
  if (
    normalized === 'VENCIMENTO CRONOTACOGRAFO' ||
    normalized === 'VENC CRONOTACOGRAFO' ||
    normalized === 'CRONOTACOGRAFO' ||
    normalized === 'VENCIMENTO TACOGRAFO' ||
    normalized === 'VENC TACOGRAFO' ||
    normalized === 'AFERICAO TACOGRAFO'
  ) {
    return 'expCrono';
  }
  if (
    normalized === 'NO SERIE EXTINTOR' ||
    normalized === 'N SERIE EXTINTOR' ||
    normalized === 'SERIE EXTINTOR'
  ) {
    return 'extinguisherSerial';
  }

  // FIPE & Capacity
  if (
    normalized.includes('VALOR TABELA FIPE') ||
    normalized === 'VALOR FIPE' ||
    normalized === 'TABELA FIPE' ||
    normalized === 'FIPE'
  ) {
    return 'fipeValue';
  }
  if (normalized === 'VALOR ATUAL' || normalized === 'VLR ATUAL') return 'currentValue';
  if (normalized.includes('CAPACIDADE DO TANQUE') || normalized === 'TANQUE') {
    return 'tankCapacity';
  }
  if (normalized === 'COMBUSTIVEL' || normalized === 'TIPO COMBUSTIVEL') {
    return 'fuelType';
  }
  if (normalized === 'CAPACIDADE PALLETS' || normalized === 'PALLETS') {
    return 'capacityPallets';
  }
  if (
    normalized.includes('CAPACIDADE CAIXAS') ||
    normalized === 'CAPACIDADE DE CARGA' ||
    normalized === 'CARGA'
  ) {
    return 'cargoCapacity';
  }
  if (normalized === 'HBFROTA' || normalized === 'HB FROTA' || normalized === 'HB') {
    return 'hbFrota';
  }

  // Checklist columns
  if (normalized === 'MACACO') return 'chk:macaco';
  if (normalized === 'CHAVE DE RODA' || normalized === 'CHAVE RODA') return 'chk:chaveRoda';
  if (normalized === 'CABO DE FORCA' || normalized === 'CABO FORCA') return 'chk:caboForca';
  if (normalized === 'PINO CAMBAO') return 'chk:pinoCambao';
  if (normalized === 'TRIANGULO') return 'chk:triangulo';
  if (normalized === 'EXTINTOR') return 'chk:extintor';
  if (normalized === 'CONE' || normalized === 'CONES') return 'chk:cones';
  if (normalized === 'TACOGRAFO') return 'chk:tacografo';
  if (normalized === 'STEP' || normalized === 'ESTEPE') return 'chk:step';
  if (normalized === 'PNEUS' || normalized === 'PNEU') return 'chk:pneus';
  if (normalized === 'PLATAFORMA') return 'chk:plataforma';
  if (normalized === 'ESTRIBO') return 'chk:estribo';
  if (normalized === 'KIT ERGONOMICO') return 'chk:kitErgonomico';
  if (normalized === 'SENSOR DE CINTO' || normalized === 'SENSOR CINTO') {
    return 'chk:sensorCinto';
  }
  if (normalized === 'COFRE') return 'chk:cofre';

  // Fleet Age & Replacement
  if (
    normalized === 'IDADE FROTA EM ANOS' ||
    normalized === 'IDADE EM ANOS' ||
    normalized === 'IDADE ANOS'
  ) {
    return 'fleetAgeYears';
  }
  if (normalized === 'PRAZO PARA TROCA EM ANOS') return 'replacementTermYears';
  if (
    normalized === 'PRAZO PARA TROCA EM KM HORA' ||
    normalized === 'PRAZO PARA TROCA EM KM HORAS'
  ) {
    return 'replacementTermKmHours';
  }
  if (
    normalized.includes('MES ANO PREVISTO PARA TROCA') ||
    normalized === 'MES ANO TROCA' ||
    normalized === 'PREVISAO TROCA'
  ) {
    return 'expectedReplacementMonthYear';
  }
  if (normalized === 'ANO COMPRA') return 'purchaseYear';
  if (
    normalized === 'IDADE FROTA ANO MESES' ||
    normalized === 'IDADE FROTA ANOS MESES' ||
    normalized === 'IDADE ANO MESES'
  ) {
    return 'fleetAgeYearMonths';
  }
  if (normalized === 'COD FIPE' || normalized === 'CODIGO FIPE') return 'fipeCode';

  return null;
}

function parseBooleanCell(raw: unknown): boolean {
  const str = cleanString(raw);
  if (str === '✓' || str === '✔') return true;
  const v = normalizeValue(str);
  if (!v) return false;
  if (
    v === 'SIM' ||
    v === 'S' ||
    v === 'OK' ||
    v === 'TRUE' ||
    v === 'VERDADEIRO' ||
    v === '1' ||
    v === 'X' ||
    v === 'C' ||
    v === 'Y' ||
    v === 'YES' ||
    v === 'CONFERIDO' ||
    v === 'CONFORME' ||
    v === 'EM DIA' ||
    v === 'PRESENTE' ||
    v === 'REGULAR' ||
    v === 'POSSUI' ||
    v === 'ATIVO'
  ) {
    return true;
  }
  return false;
}

function parseCurrencyCell(cell: CellData | undefined): number {
  if (!cell) return 0;
  if (typeof cell.raw === 'number' && Number.isFinite(cell.raw)) {
    return Math.round(cell.raw * 100) / 100;
  }
  const str = cellText(cell);
  if (!str) return 0;
  let cleaned = str.replace(/[R$\s]/gi, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseKmCell(
  cell: CellData | undefined,
  category: VehicleCategory
): { kmOrHours: number; unit: 'km' | 'h' } {
  const defaultUnit: 'km' | 'h' = category === 'Empilhadeira' ? 'h' : 'km';
  if (!cell) return { kmOrHours: 0, unit: defaultUnit };

  const textStr = cellText(cell);
  const lower = textStr.toLowerCase();
  const unit: 'km' | 'h' =
    /\b(h|hr|hrs|hora|horas)\b/.test(lower) || /\d\s*h$/.test(lower)
      ? 'h'
      : lower.includes('km')
        ? 'km'
        : defaultUnit;

  if (typeof cell.raw === 'number' && Number.isFinite(cell.raw)) {
    return { kmOrHours: Math.round(cell.raw), unit };
  }

  if (!textStr) return { kmOrHours: 0, unit };
  let numPart = textStr.replace(/[^\d.,]/g, '');
  if (numPart.includes(',') && numPart.includes('.')) {
    if (numPart.lastIndexOf(',') > numPart.lastIndexOf('.')) {
      numPart = numPart.replace(/\./g, '').replace(',', '.');
    } else {
      numPart = numPart.replace(/,/g, '');
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(numPart)) {
    numPart = numPart.replace(/\./g, '');
  } else if (numPart.includes(',')) {
    numPart = numPart.replace(',', '.');
  }
  const n = Number(numPart);
  return {
    kmOrHours: Number.isFinite(n) ? Math.round(n) : 0,
    unit,
  };
}

function parseYearCell(cell: CellData | undefined, fallback: number): number {
  if (!cell) return fallback;
  if (typeof cell.raw === 'number' && Number.isFinite(cell.raw)) {
    const y = Math.round(cell.raw);
    if (y >= 1950 && y <= 2100) return y;
    if (y >= 0 && y <= 99) {
      return y <= 50 ? 2000 + y : 1900 + y;
    }
  }
  const str = cellText(cell);
  const match4 = str.match(/\b(19\d{2}|20\d{2}|2100)\b/);
  if (match4) {
    return Number(match4[1]);
  }
  const match2 = str.trim().match(/^(\d{2})$/);
  if (match2) {
    const y = Number(match2[1]);
    return y <= 50 ? 2000 + y : 1900 + y;
  }
  return fallback;
}

function isNonApplicableMarker(str: string): boolean {
  const norm = normalizeValue(str);
  return (
    norm === '' ||
    norm === '-' ||
    norm === '--' ||
    norm === '---' ||
    norm === 'N/A' ||
    norm === 'NA' ||
    norm === 'ISENTO' ||
    norm === 'SEM' ||
    norm === 'NAO APLICA' ||
    norm === 'NAO SE APLICA' ||
    norm === 'NAO APLICAVEL'
  );
}

function formatExcelSerialToBrDate(serial: number): string {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (parsed && parsed.y >= 1950 && parsed.y <= 2100 && parsed.m && parsed.d) {
    return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
  }
  return '';
}

function parseDateCell(cell: CellData | undefined): string {
  if (!cell) return '';

  // 1. Prefer raw Date or Excel serial number so SheetJS text locale never flips day/month
  if (cell.raw instanceof Date && !Number.isNaN(cell.raw.getTime())) {
    const d = String(cell.raw.getDate()).padStart(2, '0');
    const m = String(cell.raw.getMonth() + 1).padStart(2, '0');
    const y = cell.raw.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (typeof cell.raw === 'number' && Number.isFinite(cell.raw) && cell.raw > 18000 && cell.raw < 90000) {
    const formatted = formatExcelSerialToBrDate(cell.raw);
    if (formatted) return formatted;
  }

  const rawStr = cellText(cell);
  if (!rawStr) return '';
  if (rawStr === '-' || rawStr === '--' || rawStr === '---') return '';
  if (normalizeValue(rawStr).includes('NAO APLIC') || normalizeValue(rawStr) === 'ISENTO') {
    return 'Não aplicável';
  }

  // Strip time portion (e.g. "2026-12-15T00:00:00Z" or "15/12/2026 00:00")
  const str = rawStr.split(/[T\s]/)[0]?.trim() || rawStr.trim();

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }

  // DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
  const brMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (brMatch) {
    const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${brMatch[1].padStart(2, '0')}/${brMatch[2].padStart(2, '0')}/${year}`;
  }

  // Fallback for textual numeric serial in text
  if (/^\d{5}$/.test(str)) {
    const num = Number(str);
    if (num > 18000 && num < 90000) {
      const formatted = formatExcelSerialToBrDate(num);
      if (formatted) return formatted;
    }
  }

  return rawStr;
}

export function sanitizeFleetAgeYearMonths(raw: string): string {
  const str = raw.trim();
  if (!str) return '';
  // Format unrounded decimal years like "16,097222222" or "16.097222222" into "16a 1m"
  if (/^\d+[.,]\d{2,}$/.test(str)) {
    const num = Number(str.replace(',', '.'));
    if (Number.isFinite(num) && num >= 0 && num <= 80) {
      let years = Math.floor(num);
      let months = Math.round((num - years) * 12);
      if (months >= 12) {
        years += 1;
        months = 0;
      }
      return `${years}a ${months}m`;
    }
  }
  return str;
}

function formatFleetAgeYearsCell(cell: CellData | undefined): string {
  const str = cellText(cell);
  if (!str) return '';
  if (/^\d+[.,]\d{2,}$/.test(str)) {
    const num = Number(str.replace(',', '.'));
    if (Number.isFinite(num) && num >= 0 && num <= 80) {
      const rounded = Math.round(num * 10) / 10;
      return Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(1).replace('.', ',');
    }
  }
  return str;
}

function formatFleetAgeYearMonthsCell(cell: CellData | undefined): string {
  if (!cell) return '';
  const text = cellText(cell);
  // If Excel formatted it (e.g., "4a 0m", "12/2026", etc.) and it's not a raw float or 5-digit serial
  if (text && !/^\d{5}$/.test(text)) {
    return sanitizeFleetAgeYearMonths(text);
  }
  if (typeof cell.raw === 'number' && Number.isFinite(cell.raw)) {
    if (!Number.isInteger(cell.raw) && cell.raw >= 0 && cell.raw <= 80) {
      return sanitizeFleetAgeYearMonths(String(cell.raw));
    }
  }
  return sanitizeFleetAgeYearMonths(text);
}

function formatExpectedReplacementCell(cell: CellData | undefined): string {
  if (!cell) return '';
  const text = cellText(cell);
  // Keep already formatted MM/YYYY, MMM/YY, DD/MM/YYYY, etc.
  if (text && !/^\d{5}$/.test(text)) {
    return text;
  }
  if (typeof cell.raw === 'number' && Number.isFinite(cell.raw) && cell.raw > 18000 && cell.raw < 90000) {
    const parsed = XLSX.SSF.parse_date_code(cell.raw);
    if (parsed && parsed.y && parsed.m) {
      return `${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
    }
  }
  return text;
}

function normalizeCompany(raw: unknown): Company {
  const v = normalizeValue(raw);
  if (v.includes('MATRIZ')) return 'Pau Brasil Matriz';
  if (v.includes('TERCEIR')) return 'Terceirizados';
  return 'Pau Brasil Brejo';
}

function normalizeSector(raw: unknown): Sector {
  const v = normalizeValue(raw);
  if (v.includes('VENDA')) return 'Vendas';
  if (v.includes('PUXAD')) return 'Puxada';
  if (v.includes('ARMAZ') || v.includes('DEPOS') || v.includes('EMPILH')) return 'Armazém';
  if (v.includes('MARKET') || v.includes('MKT')) return 'Marketing';
  return 'Distribuição';
}

export function normalizeCategory(raw: unknown, fallbackTypeCode?: unknown): VehicleCategory {
  const primary = normalizeValue(raw);
  const v = primary || normalizeValue(fallbackTypeCode);

  if (v.includes('CAVALO') || v.includes('TRACAO') || v.includes('TRATOR')) {
    return 'Tração Caminhão Trator';
  }
  if (
    v.includes('CARGA SEMI') ||
    v.includes('SEMI-REBOQ') ||
    v.includes('SEMI REBOQ') ||
    v.includes('CARRETA') ||
    v.includes('SEMI') ||
    v.includes('REBOQ') ||
    v.includes('BITREM') ||
    v.includes('RODOTREM')
  ) {
    return 'Carga Semi-Reboque';
  }
  if (v.includes('EMPILH') || v.includes('FORKLIFT') || v.includes('PALETEIR')) {
    return 'Empilhadeira';
  }
  if (
    v.includes('LEVE') ||
    v.includes('PICK') ||
    v.includes('UTIL') ||
    v.includes('PASSEIO') ||
    v.includes('AUTOMOV') ||
    v.includes('CAMINHONET') ||
    v.includes('CAMIONET') ||
    v.includes('FURGAO') ||
    /\bMOTO/.test(v) ||
    v.includes('CICLOMOT') ||
    v.includes('TRICICL') ||
    /\bVAN\b/.test(v) ||
    /\bSUV\b/.test(v)
  ) {
    return 'Frota Leve';
  }
  return 'Caminhão';
}

function normalizeStatus(raw: unknown): VehicleStatus {
  const v = normalizeValue(raw);
  if (
    v.includes('PARAD') ||
    v.includes('INATIV') ||
    v.includes('MANUT') ||
    v.includes('OFICIN') ||
    v.includes('BAIX') ||
    v.includes('BLOQ') ||
    v.includes('INDISPONIV') ||
    v.includes('DESATIV') ||
    v.includes('VENDID') ||
    v.includes('SINISTR') ||
    v.includes('QUEBRAD')
  ) {
    return 'Parado';
  }
  return 'Ativo';
}

function normalizeOwnership(raw: unknown): OwnershipType {
  const v = normalizeValue(raw);
  if (v.includes('TERC') || v.includes('AGREG') || v.includes('ALUG') || v.includes('LOCAD')) {
    return 'Terceiro';
  }
  return 'Próprio';
}

function findHeaderRowInfo(rows: CellData[][]): { index: number; score: number; hasPlate: boolean } {
  let bestIdx = 0;
  let bestScore = -1;
  let bestHasPlate = false;
  const maxScan = Math.min(rows.length, 30);

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    let hasPlate = false;
    let seenStatus = false;
    for (const cell of row) {
      const norm = normalizeHeader(cellText(cell));
      const mapped = mapHeaderToField(norm, seenStatus);
      if (mapped) {
        score += 1;
        if (mapped === 'plate') hasPlate = true;
        if (mapped === 'status') seenStatus = true;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = r;
      bestHasPlate = hasPlate;
    }
  }
  return {
    index: bestScore >= 2 ? bestIdx : 0,
    score: bestScore,
    hasPlate: bestHasPlate,
  };
}

function parseRowsMatrix(
  rows: CellData[][],
  sheetName: string,
  availableSheets: string[]
): ParsedFleetImport {
  if (rows.length === 0) {
    return {
      vehicles: [],
      matchedColumns: [],
      unrecognizedColumns: [],
      skippedRows: 0,
      duplicatePlates: [],
      sheetName,
      availableSheets,
    };
  }

  const { index: headerRowIdx } = findHeaderRowInfo(rows);
  const rawHeaderRow = rows[headerRowIdx] ?? [];

  let seenOperationalStatus = false;
  const columnMappings: Array<MappedField | null> = [];
  const matchedColumns: string[] = [];
  const unrecognizedColumns: string[] = [];

  for (let c = 0; c < rawHeaderRow.length; c++) {
    const rawHeader = cellText(rawHeaderRow[c]);
    const norm = normalizeHeader(rawHeader);
    const field = mapHeaderToField(norm, seenOperationalStatus);
    columnMappings.push(field);
    if (field) {
      if (field === 'status') seenOperationalStatus = true;
      if (rawHeader) matchedColumns.push(rawHeader);
    } else if (rawHeader) {
      unrecognizedColumns.push(rawHeader);
    }
  }

  const todayBr = new Date().toLocaleDateString('pt-BR');
  const currentYear = new Date().getFullYear();
  const vehicles: Vehicle[] = [];
  const seenPlateIndex = new Map<string, number>();
  const duplicatePlatesSet = new Set<string>();
  let skippedRows = 0;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const hasAnyValue = row.some((cell) => cellText(cell) !== '');
    if (!hasAnyValue) continue;

    // Collect mapped cells for this row
    const cells: Partial<Record<MappedField, CellData>> = {};
    for (let c = 0; c < columnMappings.length; c++) {
      const field = columnMappings[c];
      if (!field) continue;
      const cell = row[c];
      if (cells[field] === undefined || cellText(cells[field]) === '') {
        cells[field] = cell;
      }
    }

    const rawPlate = cellText(cells.plate).toUpperCase();
    const rawFleetNo = cellText(cells.fleetNumber);
    const rawModel = cellText(cells.model);

    if (!rawPlate && !rawFleetNo && !rawModel) {
      skippedRows += 1;
      continue;
    }

    const plate = rawPlate || rawFleetNo || `IMP-${vehicles.length + 1}`;
    const category = normalizeCategory(cellText(cells.category), cellText(cells.typeCode));
    const sector = normalizeSector(cellText(cells.sector));
    const company = normalizeCompany(cellText(cells.company));
    const status = normalizeStatus(cellText(cells.status));
    const ownership = normalizeOwnership(cellText(cells.ownership));

    const manufacturer = cellText(cells.manufacturer);
    const model = rawModel || manufacturer || 'Não informado';
    const manufacturerModel =
      manufacturer && !model.toLowerCase().includes(manufacturer.toLowerCase())
        ? `${manufacturer} ${model}`.trim()
        : model;

    const yearFab = parseYearCell(cells.yearFab, currentYear);
    const yearMod = parseYearCell(cells.yearMod, yearFab);
    const { kmOrHours, unit } = parseKmCell(cells.kmOrHours, category);

    const fipeValue = parseCurrencyCell(cells.fipeValue);
    const currentValue =
      cells.currentValue !== undefined && cellText(cells.currentValue) !== ''
        ? parseCurrencyCell(cells.currentValue)
        : fipeValue;

    const checklist: Record<ChecklistKey, boolean> = {
      macaco: parseBooleanCell(cellText(cells['chk:macaco'])),
      chaveRoda: parseBooleanCell(cellText(cells['chk:chaveRoda'])),
      caboForca: parseBooleanCell(cellText(cells['chk:caboForca'])),
      pinoCambao: parseBooleanCell(cellText(cells['chk:pinoCambao'])),
      triangulo: parseBooleanCell(cellText(cells['chk:triangulo'])),
      extintor: parseBooleanCell(cellText(cells['chk:extintor'])),
      cofre: parseBooleanCell(cellText(cells['chk:cofre'])),
      tacografo: parseBooleanCell(cellText(cells['chk:tacografo'])),
      step: parseBooleanCell(cellText(cells['chk:step'])),
      plataforma: parseBooleanCell(cellText(cells['chk:plataforma'])),
      estribo: parseBooleanCell(cellText(cells['chk:estribo'])),
      kitErgonomico: parseBooleanCell(cellText(cells['chk:kitErgonomico'])),
      sensorCinto: parseBooleanCell(cellText(cells['chk:sensorCinto'])),
      cones: parseBooleanCell(cellText(cells['chk:cones'])),
      pneus: parseBooleanCell(cellText(cells['chk:pneus'])),
    };

    const hbText = cellText(cells.hbFrota);
    const hbFrota = hbText !== '' ? parseBooleanCell(hbText) : true;

    const vehicle: Vehicle = {
      id: `veh-imp-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
      plate,
      fleetNumber: rawFleetNo,
      typeCode: cellText(cells.typeCode),
      category,
      sector,
      company,
      status,
      manufacturer,
      model,
      manufacturerModel,
      axles: cellText(cells.axles),
      yearFab,
      yearMod,
      color: cellText(cells.color),
      logoBrand: cellText(cells.logoBrand),
      operationYear: cellText(cells.operationYear),
      kmOrHours,
      unit,
      bodywork: cellText(cells.bodywork),
      tare: cellText(cells.tare),
      pbt: cellText(cells.pbt),
      ownership,
      hbFrota,
      renavam: cellText(cells.renavam),
      chassi: cellText(cells.chassi),
      extinguisherSerial: cellText(cells.extinguisherSerial),
      tankCapacity: cellText(cells.tankCapacity),
      capacityPallets: cellText(cells.capacityPallets),
      cargoCapacity: cellText(cells.cargoCapacity),
      fuelType: cellText(cells.fuelType),
      status2: cellText(cells.status2),
      fipeValue,
      currentValue,
      fipeCode: cellText(cells.fipeCode),
      fleetAgeYears: formatFleetAgeYearsCell(cells.fleetAgeYears),
      replacementTermYears: cellText(cells.replacementTermYears),
      replacementTermKmHours: cellText(cells.replacementTermKmHours),
      expectedReplacementMonthYear: formatExpectedReplacementCell(
        cells.expectedReplacementMonthYear
      ),
      purchaseYear: cellText(cells.purchaseYear),
      fleetAgeYearMonths: formatFleetAgeYearMonthsCell(cells.fleetAgeYearMonths),
      finalStatus: cellText(cells.finalStatus),
      expiryDates: {
        crlv: parseDateCell(cells.expCrlv),
        ipva: parseDateCell(cells.expIpva),
        antt: parseDateCell(cells.expAntt),
        cnt: parseDateCell(cells.expCnt),
        alvaraSanitario: parseDateCell(cells.expAlvara),
        extintor: parseDateCell(cells.expExtintor),
        cronotacografo: parseDateCell(cells.expCrono),
      },
      checklist,
      photoUrl: resolveVehiclePhoto(plate, category),
      periodBucket: '30d',
      lastUpdated: todayBr,
    };

    const plateKey = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const existingIdx = plateKey ? seenPlateIndex.get(plateKey) : undefined;
    if (existingIdx !== undefined) {
      duplicatePlatesSet.add(plate);
      vehicle.id = vehicles[existingIdx].id;
      vehicles[existingIdx] = vehicle;
    } else {
      if (plateKey) {
        seenPlateIndex.set(plateKey, vehicles.length);
      }
      vehicles.push(vehicle);
    }
  }

  return {
    vehicles,
    matchedColumns,
    unrecognizedColumns,
    skippedRows,
    duplicatePlates: Array.from(duplicatePlatesSet),
    sheetName,
    availableSheets,
  };
}

function decodeCsvBytes(buffer: ArrayBuffer): string {
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return utf8.replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && ch === delimiter) {
      count++;
    }
  }
  return count;
}

function parseTsvWithQuotes(text: string): CellData[][] {
  const rows: CellData[][] = [];
  let row: CellData[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' && current === '') {
      inQuotes = true;
    } else if (ch === '\t') {
      const trimmed = current.trim();
      row.push({ raw: trimmed, text: trimmed });
      current = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      const trimmed = current.trim();
      row.push({ raw: trimmed, text: trimmed });
      if (row.some((c) => c.text !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.length > 0 || row.length > 0) {
    const trimmed = current.trim();
    row.push({ raw: trimmed, text: trimmed });
    if (row.some((c) => c.text !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function parseDelimitedText(text: string): CellData[][] {
  const sampleLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(0, 15);

  let tabTotal = 0;
  let semiTotal = 0;
  let commaTotal = 0;
  for (const line of sampleLines) {
    tabTotal += countDelimiterOutsideQuotes(line, '\t');
    semiTotal += countDelimiterOutsideQuotes(line, ';');
    commaTotal += countDelimiterOutsideQuotes(line, ',');
  }

  const delimiter: '\t' | ';' | ',' =
    tabTotal >= semiTotal && tabTotal >= commaTotal && tabTotal > 0
      ? '\t'
      : semiTotal >= commaTotal && semiTotal > 0
        ? ';'
        : ',';

  if (delimiter === '\t') {
    return parseTsvWithQuotes(text);
  }

  // Keep raw: true for CSV so SheetJS does NOT misparse DD/MM/YYYY as MM/DD/YYYY
  const wb = XLSX.read(text, {
    type: 'string',
    FS: delimiter,
    raw: true,
  });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheet], {
    header: 1,
    defval: '',
    raw: true,
  });
  return rawMatrix.map((r) =>
    r.map((val) => {
      const s = cleanString(val);
      return { raw: val, text: s };
    })
  );
}

function extractSheetCellMatrix(sheet: XLSX.WorkSheet): CellData[][] {
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });
  const textMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const rowCount = Math.max(rawMatrix.length, textMatrix.length);
  const result: CellData[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const rawRow = rawMatrix[r] ?? [];
    const textRow = textMatrix[r] ?? [];
    const colCount = Math.max(rawRow.length, textRow.length);
    const outRow: CellData[] = [];
    for (let c = 0; c < colCount; c++) {
      const rawVal = rawRow[c] ?? '';
      const formatted = cleanString(textRow[c]);
      outRow.push({
        raw: rawVal,
        text: formatted || cleanString(rawVal),
      });
    }
    result.push(outRow);
  }
  return result;
}

export async function parseFleetSpreadsheetFile(
  file: File,
  preferredSheetName?: string
): Promise<ParsedFleetImport> {
  const lowerName = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt') || lowerName.endsWith('.tsv')) {
    const text = decodeCsvBytes(buffer);
    const rows = parseDelimitedText(text);
    return parseRowsMatrix(rows, file.name, [file.name]);
  }

  const wb = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
    cellNF: true,
    cellText: true,
  });

  const availableSheets = wb.SheetNames.length > 0 ? [...wb.SheetNames] : ['Planilha'];
  if (wb.SheetNames.length === 0) {
    return {
      vehicles: [],
      matchedColumns: [],
      unrecognizedColumns: [],
      skippedRows: 0,
      duplicatePlates: [],
      sheetName: 'Planilha',
      availableSheets,
    };
  }

  let chosenSheetName =
    preferredSheetName && wb.Sheets[preferredSheetName] ? preferredSheetName : '';
  let chosenMatrix: CellData[][] | null = null;

  if (chosenSheetName) {
    chosenMatrix = extractSheetCellMatrix(wb.Sheets[chosenSheetName]);
  } else {
    let bestOverallScore = -1;
    for (const candidateName of wb.SheetNames) {
      const candidateSheet = wb.Sheets[candidateName];
      if (!candidateSheet) continue;
      const matrix = extractSheetCellMatrix(candidateSheet);
      const headerInfo = findHeaderRowInfo(matrix);
      const dataRows = Math.max(0, matrix.length - headerInfo.index - 1);
      const compositeScore =
        headerInfo.score * 10 + (headerInfo.hasPlate ? 25 : 0) + Math.min(dataRows, 50);
      if (compositeScore > bestOverallScore) {
        bestOverallScore = compositeScore;
        chosenSheetName = candidateName;
        chosenMatrix = matrix;
      }
    }
  }

  if (!chosenSheetName || !chosenMatrix) {
    chosenSheetName = wb.SheetNames[0];
    chosenMatrix = extractSheetCellMatrix(wb.Sheets[chosenSheetName]);
  }

  return parseRowsMatrix(chosenMatrix, chosenSheetName, availableSheets);
}

export function parseFleetSpreadsheetText(text: string): ParsedFleetImport {
  const rows = parseDelimitedText(text);
  return parseRowsMatrix(rows, 'Área de Transferência', ['Área de Transferência']);
}

export function downloadFleetTemplateXlsx(): void {
  const wb = XLSX.utils.book_new();
  const sampleRow = [
    'QXW-1234',
    'Pau Brasil Brejo',
    '001',
    'CAM',
    'Ativo',
    'Distribuição',
    'Caminhão',
    'FH 540',
    '3',
    'Próprio',
    'Volvo',
    2022,
    2022,
    'Branco',
    'Sim',
    '2022',
    '125.450 km',
    'Baú',
    '8.500 kg',
    '23.000 kg',
    '01234567890',
    '9BM9580748B123456',
    '15/12/2026',
    '31/01/2027',
    '18/04/2027',
    '10/05/2027',
    '18/06/2027',
    '04/12/2026',
    '20/01/2027',
    'EXT-1001',
    480000,
    470000,
    '600 L',
    'Diesel',
    '12',
    '32.000 kg',
    'Ativo',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    'Sim',
    '4',
    '8',
    '500.000 km',
    '12/2030',
    '2022',
    '4a 0m',
    '005100-4',
    'Dentro do Prazo',
  ];

  const ws = XLSX.utils.aoa_to_sheet([[...SPREADSHEET_HEADERS], sampleRow]);
  XLSX.utils.book_append_sheet(wb, ws, 'Frota');
  XLSX.writeFile(wb, 'modelo_planilha_frota_pau_brasil.xlsx');
}

export function computeDocumentStatusFromBrDate(dateStr: string): DocumentStatus {
  const norm = normalizeValue(dateStr);
  if (norm.includes('VENCID')) return 'Vencido';
  if (norm.includes('A VENCER') || norm.includes('PENDENTE')) return 'A vencer';

  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 'Regular';
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const target = new Date(year, month, day);
  if (Number.isNaN(target.getTime())) return 'Regular';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Vencido';
  if (diffDays <= 30) return 'A vencer';
  return 'Regular';
}

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || `id-${Date.now()}`;
}

export function buildDocumentsForVehicle(v: Vehicle): VehicleDocumentRecord[] {
  const candidates: Array<{ type: DocumentType; date: string }> = [
    { type: 'CRLV', date: v.expiryDates.crlv },
    { type: 'IPVA', date: v.expiryDates.ipva },
    { type: 'ANTT', date: v.expiryDates.antt },
    { type: 'Alvará Vigilância Sanitária', date: v.expiryDates.alvaraSanitario },
    { type: 'Extintor', date: v.expiryDates.extintor },
    { type: 'Cronotacógrafo', date: v.expiryDates.cronotacografo },
  ];

  const records: VehicleDocumentRecord[] = [];
  for (const item of candidates) {
    const clean = item.date.trim();
    if (isNonApplicableMarker(clean)) continue;
    const safeVehicleId = sanitizeFirestoreId(v.id);
    const safeTypeSlug = sanitizeFirestoreId(item.type.toLowerCase());
    records.push({
      id: `doc-${safeVehicleId}-${safeTypeSlug}`.slice(0, 120),
      vehicleId: safeVehicleId,
      plate: v.plate,
      model: v.manufacturerModel,
      sector: v.sector,
      type: item.type,
      status: computeDocumentStatusFromBrDate(clean),
      expiryDate: clean,
      protocol: `${item.type.slice(0, 4).toUpperCase()}-${v.plate.replace(/[^A-Z0-9]/gi, '')}`,
      responsible: 'Importação Planilha',
    });
  }
  return records;
}

function hasValidEvidenceValue(val: string): boolean {
  const clean = val.trim();
  if (isNonApplicableMarker(clean)) return false;
  const norm = normalizeValue(clean);
  if (norm.includes('PENDENTE') || norm.includes('VENCID') || norm.includes('FALTA')) {
    return false;
  }
  return true;
}

export function buildEvidenceForVehicle(v: Vehicle): VehicleEvidenceRecord {
  const hasCrlv = hasValidEvidenceValue(v.expiryDates.crlv);
  const hasCnt = hasValidEvidenceValue(v.expiryDates.cnt);
  const hasAntt = hasValidEvidenceValue(v.expiryDates.antt);
  return {
    vehicleId: v.id,
    plate: v.plate,
    model: v.manufacturerModel,
    sector: v.sector,
    crlv: hasCrlv,
    cnt: hasCnt,
    antt: hasAntt,
    crlvFile: hasCrlv ? `CRLV_${v.plate}.pdf` : undefined,
    cntFile: hasCnt ? `CNT_${v.plate}.pdf` : undefined,
    anttFile: hasAntt ? `ANTT_${v.plate}.pdf` : undefined,
    updatedAt: v.lastUpdated,
  };
}
