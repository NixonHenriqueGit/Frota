import { Vehicle } from '../types/fleet';

const IGNORED_DOC_TOKENS = new Set([
  'CRLV',
  'ANTT',
  'CRONO',
  'CRONOTACOGRAFO',
  'CRONOTACOGRAFOS',
  'TACOGRAFO',
  'CONTRATO',
  'LOCACAO',
  'LAUDO',
  'ALVARA',
  'SANITARIO',
  'SANITARIA',
  'DOC',
  'DOCUMENTO',
  'VEICULO',
  'FROTA',
  'PDF',
  'JPG',
  'JPEG',
  'PNG',
]);

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

function isLikelyYearToken(token: string): boolean {
  if (!/^\d{4}$/.test(token)) return false;
  const num = Number(token);
  return num >= 2018 && num <= 2035;
}

export function normalizePlateKey(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Detects which vehicle a file belongs to from its filename.
 * Supports:
 * 1) Full plate match (e.g. "QFG1259", "NPR-2601")
 * 2) Unique 4-character plate suffix token (e.g. "CRLV 2601 2026.pdf" -> "NPR2601", "CRLV 7D92 2026.pdf" -> "QSK7D92")
 * 3) Unique fleet number token (e.g. "EMP0008")
 */
export function detectPlateFromFilename(
  fileName: string,
  vehicles: Vehicle[]
): string {
  if (!fileName || vehicles.length === 0) return 'GERAL';

  const baseName = stripFileExtension(fileName).toUpperCase();
  const normalizedFull = baseName.replace(/[^A-Z0-9]/g, '');

  // 1. Exact full plate match
  for (const v of vehicles) {
    const cleanPlate = normalizePlateKey(v.plate);
    if (cleanPlate.length >= 5 && normalizedFull.includes(cleanPlate)) {
      return v.plate;
    }
  }

  // Build tokenized candidates from filename (split on spaces, hyphens, underscores, etc.)
  const rawTokens = baseName
    .split(/[^A-Z0-9]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Also strip leading/trailing doc keywords from joined tokens (e.g. "CRLV2601")
  const candidateTokens = new Set<string>(rawTokens);
  for (const tok of rawTokens) {
    for (const prefix of IGNORED_DOC_TOKENS) {
      if (tok.startsWith(prefix) && tok.length > prefix.length + 3) {
        candidateTokens.add(tok.slice(prefix.length));
      }
      if (tok.endsWith(prefix) && tok.length > prefix.length + 3) {
        candidateTokens.add(tok.slice(0, tok.length - prefix.length));
      }
    }
  }

  // 2. Unique 4-character plate suffix match (excluding calendar years 2018..2035)
  const suffixMap = new Map<string, Vehicle[]>();
  for (const v of vehicles) {
    const cleanPlate = normalizePlateKey(v.plate);
    if (cleanPlate.length >= 6) {
      const suffix4 = cleanPlate.slice(-4);
      const list = suffixMap.get(suffix4) ?? [];
      list.push(v);
      suffixMap.set(suffix4, list);
    }
  }

  for (const tok of candidateTokens) {
    if (tok.length !== 4 || IGNORED_DOC_TOKENS.has(tok) || isLikelyYearToken(tok)) {
      continue;
    }
    const matches = suffixMap.get(tok);
    if (matches && matches.length === 1) {
      return matches[0].plate;
    }
  }

  // 3. Unique fleetNumber match (length >= 4)
  const fleetMap = new Map<string, Vehicle[]>();
  for (const v of vehicles) {
    const cleanFleet = normalizePlateKey(v.fleetNumber || '');
    if (cleanFleet.length >= 4) {
      const list = fleetMap.get(cleanFleet) ?? [];
      list.push(v);
      fleetMap.set(cleanFleet, list);
    }
  }

  for (const tok of candidateTokens) {
    if (tok.length < 4 || IGNORED_DOC_TOKENS.has(tok) || isLikelyYearToken(tok)) {
      continue;
    }
    const matches = fleetMap.get(tok);
    if (matches && matches.length === 1) {
      return matches[0].plate;
    }
  }

  return 'GERAL';
}
