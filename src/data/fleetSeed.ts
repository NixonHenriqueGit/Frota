import {
  ChecklistDefinition,
  ChecklistKey,
  Company,
  DocumentStatus,
  DocumentType,
  Driver,
  Sector,
  Vehicle,
  VehicleCategory,
  VehicleDocumentRecord,
  VehicleEvidenceRecord,
  VehicleStatus,
} from '../types/fleet';

export function normalizeAssetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/assets/') || url.startsWith('/src/assets/')) {
    return `.${url}`;
  }
  return url;
}

export const VEHICLE_PHOTOS: Record<VehicleCategory, string> = {
  'Caminhão': './src/assets/images/truck_heavy_fleet_1795264288033.jpg',
  'Carga Semi-Reboque': './src/assets/images/truck_heavy_fleet_1795264288033.jpg',
  'Empilhadeira': './src/assets/images/forklift_warehouse_fleet_1795264288674.jpg',
  'Frota Leve': './src/assets/images/pickup_light_fleet_1795264288385.jpg',
  'Tração Caminhão Trator': './src/assets/images/truck_heavy_fleet_1795264288033.jpg',
};

export const PLATE_PHOTOS: Record<string, string> = {
  NPR2601: './assets/aistudio/LATERAL_NPR2601_1c9ba03f.jpeg',
  OXO0532: './assets/aistudio/LATERAL_OXO0532_4fa1d8bb.jpeg',
  OXO0542: './assets/aistudio/LATERAL_OXO0542_ce861979.jpeg',
  OXO0782: './assets/aistudio/LATERAL_OXO0782_a8235e7e.jpeg',
  QSK7D92: './assets/aistudio/LATERAL_QSK7D92_928a914d.jpeg',
  RLU4H49: './assets/aistudio/RLU4H49_314cb24e.jpg',
  RLW0C17: './assets/aistudio/LATERAL_RLW0C17_d8abdb6c.jpeg',
  SLB3J76: './assets/aistudio/LATERAL_SLB3J76_3a3a2c78.jpeg',
  SLB4A26: './assets/aistudio/LATERAL_SLB4A26_6a807cb5.jpeg',
  SLB4A56: './assets/aistudio/LATERAL_SLB4A56_9515828e.jpeg',
  TOU7F39: './assets/aistudio/TOU7F39_4191f85c.jpeg',
  TOZ8B20: './assets/aistudio/LATERAL_TOZ8B20_641b08d0.jpeg',
  TOZ8B50: './assets/aistudio/LATERAL_TOZ8B50_453e611f.jpeg',
};

const DEFAULT_PHOTO_SET = new Set(Object.values(VEHICLE_PHOTOS));

export function resolveVehiclePhoto(
  plate: string,
  category: VehicleCategory,
  currentPhotoUrl?: string
): string {
  const norm = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const normalizedCurrent = currentPhotoUrl ? normalizeAssetUrl(currentPhotoUrl) : '';
  if (normalizedCurrent && !DEFAULT_PHOTO_SET.has(normalizedCurrent)) {
    return normalizedCurrent;
  }
  if (PLATE_PHOTOS[norm]) {
    return PLATE_PHOTOS[norm];
  }
  return VEHICLE_PHOTOS[category];
}

export const CHECKLIST_ITEMS: ChecklistDefinition[] = [
  { key: 'macaco', label: 'Macaco' },
  { key: 'chaveRoda', label: 'Chave de roda' },
  { key: 'caboForca', label: 'Cabo de força' },
  { key: 'pinoCambao', label: 'Pino cambão' },
  { key: 'triangulo', label: 'Triângulo' },
  { key: 'extintor', label: 'Extintor' },
  { key: 'cones', label: 'Cone' },
  { key: 'tacografo', label: 'Tacógrafo' },
  { key: 'step', label: 'Step' },
  { key: 'pneus', label: 'Pneus' },
  { key: 'plataforma', label: 'Plataforma' },
  { key: 'estribo', label: 'Estribo' },
  { key: 'kitErgonomico', label: 'Kit Ergonômico' },
  { key: 'sensorCinto', label: 'Sensor de cinto' },
  { key: 'cofre', label: 'Cofre' },
];

export const CATEGORY_META: Record<
  VehicleCategory,
  { label: string; pluralLabel: string; color: string }
> = {
  'Caminhão': { label: 'Caminhão', pluralLabel: 'Caminhão', color: '#0B63CE' },
  'Carga Semi-Reboque': {
    label: 'Carga Semi-Reboque',
    pluralLabel: 'Carga Semi-Reboque',
    color: '#7C4DFF',
  },
  'Empilhadeira': {
    label: 'Empilhadeira',
    pluralLabel: 'Empilhadeira',
    color: '#EAB308',
  },
  'Frota Leve': { label: 'Frota Leve', pluralLabel: 'Frota Leve', color: '#00A8C6' },
  'Tração Caminhão Trator': {
    label: 'Tração Caminhão Trator',
    pluralLabel: 'Tração Caminhão Trator',
    color: '#199A4E',
  },
};

export const SECTOR_META: Record<Sector, { color: string }> = {
  'Distribuição': { color: '#0B63CE' },
  'Vendas': { color: '#199A4E' },
  'Puxada': { color: '#EE740B' },
  'Armazém': { color: '#8E54E9' },
  'Marketing': { color: '#00A8C6' },
};

export const DOCUMENT_TYPES: DocumentType[] = [
  'CRLV',
  'IPVA',
  'Cronotacógrafo',
  'ANTT',
  'Alvará Vigilância Sanitária',
  'Extintor',
];

function createDefaultChecklist(allChecked = true): Record<ChecklistKey, boolean> {
  return {
    macaco: allChecked,
    chaveRoda: allChecked,
    caboForca: allChecked,
    pinoCambao: allChecked,
    triangulo: allChecked,
    extintor: allChecked,
    cofre: allChecked,
    tacografo: allChecked,
    step: allChecked,
    plataforma: allChecked,
    estribo: allChecked,
    kitErgonomico: allChecked,
    sensorCinto: allChecked,
    cones: allChecked,
    pneus: allChecked,
  };
}

interface VehicleBlueprint {
  plate: string;
  category: VehicleCategory;
  sector: Sector;
  company: Company;
  status: VehicleStatus;
  manufacturerModel: string;
  yearFab: number;
  yearMod: number;
  kmOrHours: number;
  unit?: 'km' | 'h';
  ownership?: 'Próprio' | 'Terceiro';
  hbFrota?: boolean;
  renavam?: string;
  chassi?: string;
  tankCapacity?: string;
  cargoCapacity?: string;
  fuelType?: string;
  fipeValue?: number;
  currentValue?: number;
  crlv?: string;
  ipva?: string;
  crono?: string;
  periodBucket?: '30d' | '6m' | '12m';
}

const BLUEPRINTS: VehicleBlueprint[] = [
  // Featured 5 rows (exact match to screenshot)
  {
    plate: 'QXW-1234',
    category: 'Caminhão',
    sector: 'Distribuição',
    company: 'Pau Brasil Brejo',
    status: 'Ativo',
    manufacturerModel: 'Volvo FH 540',
    yearFab: 2022,
    yearMod: 2022,
    kmOrHours: 125450,
    ownership: 'Próprio',
    hbFrota: true,
    renavam: '01234567890',
    chassi: '9BM9580748B123456',
    tankCapacity: '600 L',
    cargoCapacity: '32.000 kg',
    fuelType: 'Diesel',
    fipeValue: 480000,
    currentValue: 470000,
    crlv: '15/12/2026',
    ipva: '31/01/2027',
    crono: '20/01/2027',
    periodBucket: '30d',
  },
  {
    plate: 'RTE-5678',
    category: 'Frota Leve',
    sector: 'Vendas',
    company: 'Pau Brasil Brejo',
    status: 'Ativo',
    manufacturerModel: 'VW Polo Track',
    yearFab: 2023,
    yearMod: 2023,
    kmOrHours: 32180,
    ownership: 'Próprio',
    hbFrota: true,
    renavam: '02345678901',
    chassi: '9C2KC2200PR045678',
    tankCapacity: '52 L',
    cargoCapacity: '450 kg',
    fuelType: 'Flex',
    fipeValue: 84800,
    currentValue: 81200,
    crlv: '28/11/2026',
    ipva: '15/02/2027',
    crono: 'Não aplicável',
    periodBucket: '30d',
  },
  {
    plate: 'FHG-9012',
    category: 'Tração Caminhão Trator',
    sector: 'Puxada',
    company: 'Pau Brasil Matriz',
    status: 'Parado',
    manufacturerModel: 'Scania R450',
    yearFab: 2021,
    yearMod: 2021,
    kmOrHours: 98700,
    ownership: 'Próprio',
    hbFrota: true,
    renavam: '03456789012',
    chassi: '9BSR4X20003981234',
    tankCapacity: '700 L',
    cargoCapacity: '45.000 kg',
    fuelType: 'Diesel',
    fipeValue: 530000,
    currentValue: 512000,
    crlv: '10/11/2026',
    ipva: '20/01/2027',
    crono: '05/12/2026',
    periodBucket: '30d',
  },
  {
    plate: 'KLO-3456',
    category: 'Carga Semi-Reboque',
    sector: 'Distribuição',
    company: 'Terceirizados',
    status: 'Ativo',
    manufacturerModel: 'Randon SR',
    yearFab: 2021,
    yearMod: 2021,
    kmOrHours: 87620,
    ownership: 'Terceiro',
    hbFrota: true,
    renavam: '04567890123',
    chassi: '9ADG12430MM441230',
    tankCapacity: 'Não aplicável',
    cargoCapacity: '36.000 kg',
    fuelType: 'Semirreboque',
    fipeValue: 175000,
    currentValue: 168000,
    crlv: '22/12/2026',
    ipva: '28/02/2027',
    crono: 'Não aplicável',
    periodBucket: '30d',
  },
  {
    plate: 'ABC-7890',
    category: 'Frota Leve',
    sector: 'Marketing',
    company: 'Pau Brasil Brejo',
    status: 'Ativo',
    manufacturerModel: 'Fiat Strada',
    yearFab: 2024,
    yearMod: 2024,
    kmOrHours: 12300,
    ownership: 'Próprio',
    hbFrota: true,
    renavam: '05678901234',
    chassi: '9BD281B92RY902341',
    tankCapacity: '55 L',
    cargoCapacity: '720 kg',
    fuelType: 'Flex',
    fipeValue: 108000,
    currentValue: 105000,
    crlv: '30/12/2026',
    ipva: '15/03/2027',
    crono: 'Não aplicável',
    periodBucket: '30d',
  },

  // 17 more Caminhões in Distribuição (Total Caminhões = 20, Distribuição = 21)
  { plate: 'PBR-1001', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'MB Accelo 1016', yearFab: 2022, yearMod: 2023, kmOrHours: 74200, periodBucket: '30d' },
  { plate: 'PBR-1002', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'VW Delivery 11.180', yearFab: 2023, yearMod: 2023, kmOrHours: 51900, periodBucket: '30d' },
  { plate: 'PBR-1003', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'MB Atego 1719', yearFab: 2021, yearMod: 2022, kmOrHours: 112340, periodBucket: '6m' },
  { plate: 'PBR-1004', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'VW Constellation 24.280', yearFab: 2022, yearMod: 2022, kmOrHours: 104800, periodBucket: '6m' },
  { plate: 'PBR-1005', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Iveco Tector 170E28', yearFab: 2020, yearMod: 2021, kmOrHours: 141200, periodBucket: '12m' },
  { plate: 'PBR-1006', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'MB Accelo 815', yearFab: 2023, yearMod: 2024, kmOrHours: 38450, periodBucket: '30d' },
  { plate: 'PBR-1007', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'VW Delivery 9.170', yearFab: 2022, yearMod: 2022, kmOrHours: 68910, periodBucket: '6m' },
  { plate: 'PBR-1008', category: 'Caminhão', sector: 'Distribuição', company: 'Terceirizados', status: 'Ativo', manufacturerModel: 'Volvo VM 270', yearFab: 2021, yearMod: 2021, kmOrHours: 119600, ownership: 'Terceiro', periodBucket: '6m' },
  { plate: 'PBR-1009', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'MB Atego 2426', yearFab: 2022, yearMod: 2023, kmOrHours: 88300, periodBucket: '6m' },
  { plate: 'PBR-1010', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'VW Constellation 17.280', yearFab: 2023, yearMod: 2023, kmOrHours: 61500, periodBucket: '30d' },
  { plate: 'PBR-1011', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Parado', manufacturerModel: 'MB Accelo 1016', yearFab: 2019, yearMod: 2020, kmOrHours: 164800, periodBucket: '12m' },
  { plate: 'PBR-1012', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'VW Delivery 13.180', yearFab: 2023, yearMod: 2024, kmOrHours: 42100, periodBucket: '30d' },
  { plate: 'PBR-1013', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Volvo VM 330', yearFab: 2022, yearMod: 2022, kmOrHours: 95200, periodBucket: '6m' },
  { plate: 'PBR-1014', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'MB Atego 1419', yearFab: 2021, yearMod: 2022, kmOrHours: 109400, periodBucket: '12m' },
  { plate: 'PBR-1015', category: 'Caminhão', sector: 'Distribuição', company: 'Terceirizados', status: 'Ativo', manufacturerModel: 'Iveco Daily 70-170', yearFab: 2023, yearMod: 2023, kmOrHours: 44700, ownership: 'Terceiro', periodBucket: '30d' },
  { plate: 'PBR-1016', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'VW Delivery 11.180', yearFab: 2024, yearMod: 2024, kmOrHours: 23400, periodBucket: '30d' },
  { plate: 'PBR-1017', category: 'Caminhão', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'MB Accelo 1316', yearFab: 2022, yearMod: 2022, kmOrHours: 77800, periodBucket: '6m' },

  // 2 Caminhões in Puxada
  { plate: 'PBR-1018', category: 'Caminhão', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Volvo FH 460', yearFab: 2021, yearMod: 2022, kmOrHours: 152000, periodBucket: '12m' },
  { plate: 'PBR-1019', category: 'Caminhão', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Scania P360', yearFab: 2020, yearMod: 2021, kmOrHours: 171300, periodBucket: '12m' },

  // Frota Leve in Vendas
  { plate: 'QWE-1111', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Strada Freedom', yearFab: 2023, yearMod: 2023, kmOrHours: 24500, periodBucket: '30d' },
  { plate: 'MTO-2001', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Chevrolet Onix Plus', yearFab: 2023, yearMod: 2024, kmOrHours: 19800, periodBucket: '30d' },
  { plate: 'MTO-2002', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Mobi Like', yearFab: 2022, yearMod: 2022, kmOrHours: 36400, periodBucket: '6m' },
  { plate: 'MTO-2003', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'VW Saveiro Robust', yearFab: 2023, yearMod: 2023, kmOrHours: 28100, periodBucket: '6m' },
  { plate: 'MTO-2004', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Renault Kwid Zen', yearFab: 2022, yearMod: 2023, kmOrHours: 33900, periodBucket: '6m' },
  { plate: 'MTO-2005', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Fiorino Endurance', yearFab: 2024, yearMod: 2024, kmOrHours: 11200, periodBucket: '30d' },
  { plate: 'MTO-2006', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'VW Polo Track', yearFab: 2023, yearMod: 2023, kmOrHours: 21500, periodBucket: '30d' },
  { plate: 'MTO-2007', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Chevrolet Onix 1.0', yearFab: 2022, yearMod: 2022, kmOrHours: 41200, periodBucket: '12m' },
  { plate: 'MTO-2008', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Argo Drive', yearFab: 2024, yearMod: 2024, kmOrHours: 9800, periodBucket: '30d' },
  { plate: 'MTO-2009', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Strada Endurance', yearFab: 2023, yearMod: 2023, kmOrHours: 25600, periodBucket: '6m' },
  { plate: 'MTO-2010', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Parado', manufacturerModel: 'VW Gol 1.0', yearFab: 2020, yearMod: 2021, kmOrHours: 58300, periodBucket: '12m' },
  { plate: 'MTO-2011', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Chevrolet Montana', yearFab: 2023, yearMod: 2024, kmOrHours: 17400, periodBucket: '30d' },
  { plate: 'MTO-2012', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Fiorino Hard', yearFab: 2022, yearMod: 2022, kmOrHours: 39100, periodBucket: '6m' },
  { plate: 'MTO-2013', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Hyundai HB20 Sense', yearFab: 2024, yearMod: 2024, kmOrHours: 12900, periodBucket: '30d' },
  { plate: 'MTO-2014', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'VW Saveiro Trendline', yearFab: 2022, yearMod: 2023, kmOrHours: 31700, periodBucket: '6m' },
  { plate: 'MTO-2015', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Strada Volcano', yearFab: 2023, yearMod: 2023, kmOrHours: 22400, periodBucket: '6m' },
  { plate: 'MTO-2016', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'BYD Dolphin Mini', yearFab: 2024, yearMod: 2024, kmOrHours: 8400, periodBucket: '30d' },
  { plate: 'MTO-2017', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Chevrolet Onix LT', yearFab: 2023, yearMod: 2023, kmOrHours: 27300, periodBucket: '6m' },

  // 4 more Tração Caminhão Trator in Puxada
  { plate: 'CAV-3001', category: 'Tração Caminhão Trator', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Volvo FH 540', yearFab: 2022, yearMod: 2023, kmOrHours: 138400, periodBucket: '6m' },
  { plate: 'CAV-3002', category: 'Tração Caminhão Trator', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'MB Actros 2651', yearFab: 2023, yearMod: 2023, kmOrHours: 94200, periodBucket: '30d' },
  { plate: 'CAV-3003', category: 'Tração Caminhão Trator', sector: 'Puxada', company: 'Terceirizados', status: 'Ativo', manufacturerModel: 'DAF XF 530', yearFab: 2022, yearMod: 2022, kmOrHours: 145800, ownership: 'Terceiro', periodBucket: '6m' },
  { plate: 'CAV-3004', category: 'Tração Caminhão Trator', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Scania R500', yearFab: 2023, yearMod: 2024, kmOrHours: 76100, periodBucket: '30d' },

  // 4 more Carga Semi-Reboque
  { plate: 'CAR-4001', category: 'Carga Semi-Reboque', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Facchini Sider', yearFab: 2022, yearMod: 2022, kmOrHours: 91200, ownership: 'Próprio', periodBucket: '6m' },
  { plate: 'CAR-4002', category: 'Carga Semi-Reboque', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Randon Graneleira', yearFab: 2022, yearMod: 2023, kmOrHours: 112500, ownership: 'Próprio', periodBucket: '6m' },
  { plate: 'CAR-4003', category: 'Carga Semi-Reboque', sector: 'Puxada', company: 'Terceirizados', status: 'Ativo', manufacturerModel: 'Guerra Furgão', yearFab: 2021, yearMod: 2021, kmOrHours: 129000, ownership: 'Terceiro', periodBucket: '12m' },
  { plate: 'CAR-4004', category: 'Carga Semi-Reboque', sector: 'Puxada', company: 'Pau Brasil Matriz', status: 'Ativo', manufacturerModel: 'Librelato Baú', yearFab: 2023, yearMod: 2023, kmOrHours: 64300, ownership: 'Próprio', periodBucket: '30d' },

  // 2 more Frota Leve
  { plate: 'FLV-5001', category: 'Frota Leve', sector: 'Distribuição', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Fiat Fiorino Endurance', yearFab: 2023, yearMod: 2023, kmOrHours: 29400, periodBucket: '30d' },
  { plate: 'FLV-5002', category: 'Frota Leve', sector: 'Vendas', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Toyota Hilux SRV', yearFab: 2023, yearMod: 2024, kmOrHours: 34200, periodBucket: '6m' },

  // 2 Empilhadeiras in Armazém
  { plate: 'EMP-6001', category: 'Empilhadeira', sector: 'Armazém', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Toyota 8FG25', yearFab: 2022, yearMod: 2022, kmOrHours: 3420, unit: 'h', periodBucket: '30d' },
  { plate: 'EMP-6002', category: 'Empilhadeira', sector: 'Armazém', company: 'Pau Brasil Brejo', status: 'Ativo', manufacturerModel: 'Hyster H50FT', yearFab: 2021, yearMod: 2021, kmOrHours: 4890, unit: 'h', periodBucket: '6m' },
];

function defaultsByCategory(cat: VehicleCategory) {
  switch (cat) {
    case 'Caminhão':
      return {
        tank: '300 L',
        cargo: '14.000 kg',
        fuel: 'Diesel',
        fipe: 320000,
        current: 308000,
      };
    case 'Tração Caminhão Trator':
      return {
        tank: '700 L',
        cargo: '45.000 kg',
        fuel: 'Diesel',
        fipe: 540000,
        current: 525000,
      };
    case 'Carga Semi-Reboque':
      return {
        tank: 'Não aplicável',
        cargo: '36.000 kg',
        fuel: 'Semirreboque',
        fipe: 185000,
        current: 178000,
      };
    case 'Frota Leve':
      return {
        tank: '55 L',
        cargo: '750 kg',
        fuel: 'Flex',
        fipe: 115000,
        current: 110000,
      };
    case 'Empilhadeira':
      return {
        tank: 'GLP 20 kg',
        cargo: '2.500 kg',
        fuel: 'GLP',
        fipe: 145000,
        current: 138000,
      };
  }
}

export const INITIAL_VEHICLES: Vehicle[] = BLUEPRINTS.map((bp, idx) => {
  const catDef = defaultsByCategory(bp.category);
  const checklist = createDefaultChecklist(true);
  if (bp.status === 'Parado') {
    checklist.extintor = false;
    checklist.pneus = false;
  }
  const [manufacturer, ...modelParts] = bp.manufacturerModel.split(' ');
  const model = modelParts.join(' ') || bp.manufacturerModel;
  const ageYears = Math.max(0, 2026 - bp.yearFab);
  return {
    id: `veh-${idx + 1}`,
    plate: bp.plate,
    fleetNumber: `FR-${String(idx + 1).padStart(3, '0')}`,
    typeCode: bp.category.slice(0, 3).toUpperCase(),
    category: bp.category,
    sector: bp.sector,
    company: bp.company,
    status: bp.status,
    manufacturer,
    model,
    manufacturerModel: bp.manufacturerModel,
    axles: bp.category === 'Caminhão' || bp.category === 'Carga Semi-Reboque' ? '3' : '2',
    yearFab: bp.yearFab,
    yearMod: bp.yearMod,
    color: 'Branco',
    logoBrand: 'Sim',
    operationYear: String(bp.yearMod),
    kmOrHours: bp.kmOrHours,
    unit: bp.unit ?? 'km',
    bodywork:
      bp.category === 'Caminhão'
        ? 'Baú'
        : bp.category === 'Carga Semi-Reboque'
          ? 'Sider'
          : 'Padrão',
    tare: bp.category === 'Caminhão' ? '8.500 kg' : '1.200 kg',
    pbt: bp.category === 'Caminhão' ? '23.000 kg' : '2.500 kg',
    ownership: bp.ownership ?? 'Próprio',
    hbFrota: bp.hbFrota ?? true,
    renavam: bp.renavam ?? `0${String(1000000000 + idx * 73819).slice(0, 10)}`,
    chassi: bp.chassi ?? `9BM9580748B${String(100000 + idx * 1423).slice(0, 6)}`,
    extinguisherSerial: `EXT-${1000 + idx}`,
    tankCapacity: bp.tankCapacity ?? catDef.tank,
    capacityPallets: bp.category === 'Caminhão' ? '12' : '0',
    cargoCapacity: bp.cargoCapacity ?? catDef.cargo,
    fuelType: bp.fuelType ?? catDef.fuel,
    status2: bp.status,
    fipeValue: bp.fipeValue ?? catDef.fipe,
    currentValue: bp.currentValue ?? catDef.current,
    fipeCode: `005${String(100 + idx)}-4`,
    fleetAgeYears: String(ageYears),
    replacementTermYears: '8',
    replacementTermKmHours: bp.unit === 'h' ? '12.000 h' : '500.000 km',
    expectedReplacementMonthYear: `12/${bp.yearFab + 8}`,
    purchaseYear: String(bp.yearFab),
    fleetAgeYearMonths: `${ageYears}a 0m`,
    finalStatus: bp.status === 'Ativo' ? 'Dentro do Prazo' : 'Em Manutenção',
    expiryDates: {
      crlv: bp.crlv ?? '15/12/2026',
      ipva: bp.ipva ?? '31/01/2027',
      antt: '18/04/2027',
      cnt: '10/05/2027',
      alvaraSanitario: '18/06/2027',
      extintor: '04/12/2026',
      cronotacografo:
        bp.crono ??
        (bp.category === 'Caminhão' || bp.category === 'Tração Caminhão Trator'
          ? '20/01/2027'
          : 'Não aplicável'),
    },
    checklist,
    photoUrl: VEHICLE_PHOTOS[bp.category],
    periodBucket: bp.periodBucket ?? '12m',
    lastUpdated: '21/11/2026',
  };
});

export const INITIAL_DOCUMENTS: VehicleDocumentRecord[] = [
  // Featured summary items (first 6 reflect the exact statuses on the dashboard card)
  {
    id: 'doc-1',
    vehicleId: 'veh-1',
    plate: 'QXW-1234',
    model: 'Volvo FH 540',
    sector: 'Distribuição',
    type: 'CRLV',
    status: 'Regular',
    expiryDate: '15/12/2026',
    protocol: 'CRLV-2026-99102',
    responsible: 'João Silva',
  },
  {
    id: 'doc-2',
    vehicleId: 'veh-2',
    plate: 'RTE-5678',
    model: 'Honda CG 160',
    sector: 'Vendas',
    type: 'IPVA',
    status: 'A vencer',
    expiryDate: '29/11/2026',
    protocol: 'IPVA-2026-44021',
    responsible: 'João Silva',
  },
  {
    id: 'doc-3',
    vehicleId: 'veh-1',
    plate: 'QXW-1234',
    model: 'Volvo FH 540',
    sector: 'Distribuição',
    type: 'Cronotacógrafo',
    status: 'Regular',
    expiryDate: '20/01/2027',
    protocol: 'INM-8823190',
    responsible: 'Marcos Oliveira',
  },
  {
    id: 'doc-4',
    vehicleId: 'veh-3',
    plate: 'FHG-9012',
    model: 'Scania R450',
    sector: 'Puxada',
    type: 'ANTT',
    status: 'Vencido',
    expiryDate: '12/11/2026',
    protocol: 'RNTRC-0049218',
    responsible: 'Carlos Souza',
  },
  {
    id: 'doc-5',
    vehicleId: 'veh-4',
    plate: 'KLO-3456',
    model: 'Randon SR',
    sector: 'Distribuição',
    type: 'Alvará Vigilância Sanitária',
    status: 'Regular',
    expiryDate: '18/06/2027',
    protocol: 'VS-BRJ-2026-119',
    responsible: 'Marcos Oliveira',
  },
  {
    id: 'doc-6',
    vehicleId: 'veh-5',
    plate: 'ABC-7890',
    model: 'Fiat Strada',
    sector: 'Marketing',
    type: 'Extintor',
    status: 'A vencer',
    expiryDate: '04/12/2026',
    protocol: 'EXT-BRJ-7712',
    responsible: 'Ricardo Almeida',
  },
  // Additional fleet documents
  ...INITIAL_VEHICLES.slice(5, 22).flatMap((v, idx): VehicleDocumentRecord[] => {
    const statusPool: DocumentStatus[] = ['Regular', 'Regular', 'Regular', 'A vencer', 'Vencido'];
    const st = statusPool[idx % statusPool.length];
    return [
      {
        id: `doc-ext-${idx}-crlv`,
        vehicleId: v.id,
        plate: v.plate,
        model: v.manufacturerModel,
        sector: v.sector,
        type: 'CRLV',
        status: st === 'Vencido' ? 'A vencer' : 'Regular',
        expiryDate: st === 'Vencido' ? '05/12/2026' : '22/03/2027',
        protocol: `CRLV-${202600 + idx}`,
        responsible: 'Operação Brejo',
      },
      {
        id: `doc-ext-${idx}-antt`,
        vehicleId: v.id,
        plate: v.plate,
        model: v.manufacturerModel,
        sector: v.sector,
        type: idx % 2 === 0 ? 'ANTT' : 'Cronotacógrafo',
        status: idx === 11 ? 'Vencido' : idx % 4 === 0 ? 'A vencer' : 'Regular',
        expiryDate: idx === 11 ? '08/11/2026' : idx % 4 === 0 ? '02/12/2026' : '14/05/2027',
        protocol: `DOC-${88100 + idx}`,
        responsible: 'Operação Brejo',
      },
    ];
  }),
];

export const INITIAL_EVIDENCES: VehicleEvidenceRecord[] = INITIAL_VEHICLES.map((v, idx) => {
  const isPending = v.plate === 'RTE-5678' || v.plate === 'PBR-1011' || v.plate === 'MTO-2010';
  return {
    vehicleId: v.id,
    plate: v.plate,
    model: v.manufacturerModel,
    sector: v.sector,
    crlv: true,
    cnt: idx !== 16,
    antt: !isPending,
    crlvFile: `CRLV_${v.plate}_2026.pdf`,
    cntFile: idx !== 16 ? `CNT_${v.plate}.pdf` : undefined,
    anttFile: !isPending ? `ANTT_${v.plate}.pdf` : undefined,
    updatedAt: '21/11/2026',
  };
});

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    name: 'João Silva',
    cnh: '04918273645',
    cnhCategory: 'AE',
    cnhExpiry: '14/08/2028',
    phone: '(98) 99124-3310',
    sector: 'Vendas',
    assignedPlates: ['QXW-1234', 'RTE-5678'],
    status: 'Ativo',
  },
  {
    id: 'drv-2',
    name: 'Carlos Souza',
    cnh: '05829104756',
    cnhCategory: 'E',
    cnhExpiry: '22/04/2027',
    phone: '(98) 98841-9021',
    sector: 'Puxada',
    assignedPlates: ['FHG-9012'],
    status: 'Ativo',
  },
  {
    id: 'drv-3',
    name: 'Marcos Oliveira',
    cnh: '06738291045',
    cnhCategory: 'E',
    cnhExpiry: '10/11/2027',
    phone: '(98) 99201-4478',
    sector: 'Distribuição',
    assignedPlates: ['KLO-3456', 'ABC-7890'],
    status: 'Ativo',
  },
  {
    id: 'drv-4',
    name: 'Ricardo Almeida',
    cnh: '07819283746',
    cnhCategory: 'AB',
    cnhExpiry: '05/03/2029',
    phone: '(98) 99178-2214',
    sector: 'Marketing',
    assignedPlates: ['QWE-1111'],
    status: 'Ativo',
  },
  {
    id: 'drv-5',
    name: 'Antônio Ferreira',
    cnh: '08192837465',
    cnhCategory: 'D',
    cnhExpiry: '19/09/2027',
    phone: '(98) 98412-5580',
    sector: 'Distribuição',
    assignedPlates: ['PBR-1001', 'PBR-1002'],
    status: 'Ativo',
  },
  {
    id: 'drv-6',
    name: 'Lucas Mendes',
    cnh: '09283746510',
    cnhCategory: 'A',
    cnhExpiry: '11/01/2028',
    phone: '(98) 99310-7743',
    sector: 'Vendas',
    assignedPlates: ['MTO-2001', 'MTO-2002'],
    status: 'Ativo',
  },
  {
    id: 'drv-7',
    name: 'Francisco Costa',
    cnh: '01928374659',
    cnhCategory: 'E',
    cnhExpiry: '30/06/2027',
    phone: '(98) 98755-1209',
    sector: 'Puxada',
    assignedPlates: ['CAV-3001', 'CAR-4002'],
    status: 'Ativo',
  },
  {
    id: 'drv-8',
    name: 'Rafael Lima',
    cnh: '03847561920',
    cnhCategory: 'B',
    cnhExpiry: '15/12/2026',
    phone: '(98) 99104-6632',
    sector: 'Armazém',
    assignedPlates: ['EMP-6001', 'EMP-6002'],
    status: 'Férias',
  },
];
