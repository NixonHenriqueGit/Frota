/**
 * Security Rules Specification & Verification Matrix for "Dirty Dozen" Payloads.
 * Designed for @firebase/rules-unit-testing against firestore.rules.
 */

export interface DirtyDozenCase {
  id: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  attackType: string;
  expectedResult: 'PERMISSION_DENIED';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  path: string;
  payload?: Record<string, unknown>;
}

const VALID_CHECKLIST = {
  macaco: true,
  chaveRoda: true,
  caboForca: true,
  pinoCambao: true,
  triangulo: true,
  extintor: true,
  cofre: true,
  tacografo: true,
  step: true,
  plataforma: true,
  estribo: true,
  kitErgonomico: true,
  sensorCinto: true,
  cones: true,
  pneus: true,
};

const VALID_EXPIRY = {
  crlv: '15/12/2026',
  ipva: '31/01/2027',
  antt: '18/04/2027',
  cnt: '10/05/2027',
  alvaraSanitario: '18/06/2027',
  extintor: '04/12/2026',
  cronotacografo: '20/01/2027',
};

export function buildValidVehiclePayload(ownerId: string, id = 'veh-test-1'): Record<string, unknown> {
  return {
    id,
    ownerId,
    plate: 'QXW-1234',
    fleetNumber: 'FR-001',
    typeCode: 'CAM',
    category: 'Caminhão',
    sector: 'Distribuição',
    company: 'Pau Brasil Brejo',
    status: 'Ativo',
    manufacturer: 'Volvo',
    model: 'FH 540',
    manufacturerModel: 'Volvo FH 540',
    axles: '3',
    yearFab: 2022,
    yearMod: 2022,
    color: 'Branco',
    logoBrand: 'Sim',
    operationYear: '2022',
    kmOrHours: 125450,
    unit: 'km',
    bodywork: 'Baú',
    tare: '8.500 kg',
    pbt: '23.000 kg',
    ownership: 'Próprio',
    hbFrota: true,
    renavam: '01234567890',
    chassi: '9BM9580748B123456',
    extinguisherSerial: 'EXT-1000',
    tankCapacity: '600 L',
    capacityPallets: '12',
    cargoCapacity: '32.000 kg',
    fuelType: 'Diesel',
    status2: 'Ativo',
    fipeValue: 480000,
    currentValue: 470000,
    fipeCode: '005100-4',
    fleetAgeYears: '4',
    replacementTermYears: '8',
    replacementTermKmHours: '500.000 km',
    expectedReplacementMonthYear: '12/2030',
    purchaseYear: '2022',
    fleetAgeYearMonths: '4a 0m',
    finalStatus: 'Dentro do Prazo',
    expiryDates: VALID_EXPIRY,
    checklist: VALID_CHECKLIST,
    photoUrl: '/assets/aistudio/LATERAL_NPR2601_1c9ba03f.jpeg',
    periodBucket: '30d',
    lastUpdated: '21/11/2026',
  };
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    collection: 'vehicles',
    operation: 'create',
    attackType: 'Ghost Field Injection',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/vehicles/veh-ghost-1',
    payload: {
      ...buildValidVehiclePayload('user-a', 'veh-ghost-1'),
      isVerified: true,
    },
  },
  {
    id: 'DD-02',
    collection: 'vehicles',
    operation: 'create',
    attackType: 'Identity Spoofing',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    path: '/vehicles/veh-spoof-1',
    payload: buildValidVehiclePayload('victim-uid', 'veh-spoof-1'),
  },
  {
    id: 'DD-03',
    collection: 'vehicles',
    operation: 'create',
    attackType: 'Email Spoofing (unverified admin email)',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'spoofer-uid', email: 'paubrasilabastecimento@gmail.com', email_verified: false },
    path: '/vehicles/veh-unverified-1',
    payload: buildValidVehiclePayload('spoofer-uid', 'veh-unverified-1'),
  },
  {
    id: 'DD-04',
    collection: 'vehicles',
    operation: 'create',
    attackType: 'Path Variable ID Poisoning',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/vehicles/bad$id!poison',
    payload: buildValidVehiclePayload('user-a', 'bad$id!poison'),
  },
  {
    id: 'DD-05',
    collection: 'vehicles',
    operation: 'create',
    attackType: 'Value Poisoning / MaxLength Overflow',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/vehicles/veh-overflow-1',
    payload: {
      ...buildValidVehiclePayload('user-a', 'veh-overflow-1'),
      plate: 'X'.repeat(500),
    },
  },
  {
    id: 'DD-06',
    collection: 'documents',
    operation: 'create',
    attackType: 'Orphaned Document (missing parent vehicle)',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/documents/doc-orphan-1',
    payload: {
      id: 'doc-orphan-1',
      ownerId: 'user-a',
      vehicleId: 'nonexistent-vehicle',
      plate: 'QXW-1234',
      model: 'Volvo FH 540',
      sector: 'Distribuição',
      type: 'CRLV',
      status: 'Regular',
      expiryDate: '15/12/2026',
      protocol: 'CRLV-001',
      responsible: 'Gestão Brejo',
    },
  },
  {
    id: 'DD-07',
    collection: 'evidences',
    operation: 'create',
    attackType: 'Cross-Tenant Attachment to Victim Vehicle',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    path: '/evidences/veh-victim-1',
    payload: {
      vehicleId: 'veh-victim-1',
      ownerId: 'attacker-uid',
      plate: 'QXW-1234',
      model: 'Volvo FH 540',
      sector: 'Distribuição',
      crlv: true,
      cnt: true,
      antt: true,
      crlvFile: 'CRLV.pdf',
      cntFile: 'CNT.pdf',
      anttFile: 'ANTT.pdf',
      updatedDate: '21/11/2026',
    },
  },
  {
    id: 'DD-08',
    collection: 'vehicles',
    operation: 'create',
    attackType: 'Client Timestamp Forgery',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/vehicles/veh-time-1',
    payload: {
      ...buildValidVehiclePayload('user-a', 'veh-time-1'),
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
  },
  {
    id: 'DD-09',
    collection: 'vehicles',
    operation: 'update',
    attackType: 'Immutable Field Tampering (ownerId)',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/vehicles/veh-test-1',
    payload: {
      ownerId: 'other-user-uid',
    },
  },
  {
    id: 'DD-10',
    collection: 'admins',
    operation: 'create',
    attackType: 'Self-Assigned Privilege Escalation',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'regular-user', email: 'regular@example.com', email_verified: true },
    path: '/admins/regular-user',
    payload: {
      uid: 'regular-user',
      email: 'regular@example.com',
      grantedBy: 'regular-user',
    },
  },
  {
    id: 'DD-11',
    collection: 'users',
    operation: 'get',
    attackType: 'PII Cross-User Read',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/users/user-b',
  },
  {
    id: 'DD-12',
    collection: 'vehicles',
    operation: 'list',
    attackType: 'Unscoped List Scraping',
    expectedResult: 'PERMISSION_DENIED',
    auth: { uid: 'user-a', email: 'a@example.com', email_verified: true },
    path: '/vehicles',
  },
];
