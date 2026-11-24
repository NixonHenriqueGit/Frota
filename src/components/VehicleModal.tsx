import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  ChecklistKey,
  Company,
  OwnershipType,
  Sector,
  Vehicle,
  VehicleCategory,
  VehicleStatus,
} from '../types/fleet';
import { CHECKLIST_ITEMS, resolveVehiclePhoto } from '../data/fleetSeed';

interface VehicleModalProps {
  isOpen: boolean;
  editingVehicle: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: Vehicle, isEdit: boolean) => void;
}

const CATEGORIES: VehicleCategory[] = [
  'Caminhão',
  'Carga Semi-Reboque',
  'Empilhadeira',
  'Frota Leve',
  'Tração Caminhão Trator',
];

const SECTORS: Sector[] = ['Distribuição', 'Vendas', 'Puxada', 'Armazém', 'Marketing'];
const COMPANIES: Company[] = ['Pau Brasil Brejo', 'Pau Brasil Matriz', 'Terceirizados'];

type FormTab = 'identificacao' | 'especificacoes' | 'documentos' | 'fipe' | 'checklist';

const TABS: { id: FormTab; label: string }[] = [
  { id: 'identificacao', label: '1. Identificação' },
  { id: 'especificacoes', label: '2. Especificações' },
  { id: 'documentos', label: '3. Vencimentos' },
  { id: 'fipe', label: '4. FIPE & Troca' },
  { id: 'checklist', label: '5. Checklist' },
];

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  editingVehicle,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<FormTab>('identificacao');
  const [error, setError] = useState('');

  // 1. Identificação
  const [plate, setPlate] = useState('');
  const [company, setCompany] = useState<Company>('Pau Brasil Brejo');
  const [fleetNumber, setFleetNumber] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('Ativo');
  const [sector, setSector] = useState<Sector>('Distribuição');
  const [category, setCategory] = useState<VehicleCategory>('Caminhão');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [ownership, setOwnership] = useState<OwnershipType>('Próprio');
  const [hbFrota, setHbFrota] = useState(true);
  const [status2, setStatus2] = useState('Ativo');

  // 2. Especificações
  const [axles, setAxles] = useState('2');
  const [yearFab, setYearFab] = useState(2024);
  const [yearMod, setYearMod] = useState(2024);
  const [color, setColor] = useState('Branco');
  const [logoBrand, setLogoBrand] = useState('Sim');
  const [operationYear, setOperationYear] = useState('2024');
  const [kmOrHours, setKmOrHours] = useState(0);
  const [bodywork, setBodywork] = useState('Baú');
  const [tare, setTare] = useState('');
  const [pbt, setPbt] = useState('');
  const [tankCapacity, setTankCapacity] = useState('300 L');
  const [fuelType, setFuelType] = useState('Diesel');
  const [capacityPallets, setCapacityPallets] = useState('');
  const [cargoCapacity, setCargoCapacity] = useState('');

  // 3. Documentação & Vencimentos
  const [renavam, setRenavam] = useState('');
  const [chassi, setChassi] = useState('');
  const [crlv, setCrlv] = useState('');
  const [ipva, setIpva] = useState('');
  const [antt, setAntt] = useState('');
  const [cnt, setCnt] = useState('');
  const [alvaraSanitario, setAlvaraSanitario] = useState('');
  const [extintorDate, setExtintorDate] = useState('');
  const [extinguisherSerial, setExtinguisherSerial] = useState('');
  const [cronotacografo, setCronotacografo] = useState('');

  // 4. FIPE & Troca
  const [fipeValue, setFipeValue] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [fipeCode, setFipeCode] = useState('');
  const [fleetAgeYears, setFleetAgeYears] = useState('0');
  const [replacementTermYears, setReplacementTermYears] = useState('8');
  const [replacementTermKmHours, setReplacementTermKmHours] = useState('500.000 km');
  const [expectedReplacementMonthYear, setExpectedReplacementMonthYear] = useState('');
  const [purchaseYear, setPurchaseYear] = useState('2024');
  const [fleetAgeYearMonths, setFleetAgeYearMonths] = useState('0a 0m');
  const [finalStatus, setFinalStatus] = useState('Dentro do Prazo');

  // 5. Checklist
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>(() =>
    Object.fromEntries(CHECKLIST_ITEMS.map((item) => [item.key, true])) as Record<
      ChecklistKey,
      boolean
    >
  );

  useEffect(() => {
    setActiveTab('identificacao');
    setError('');

    if (editingVehicle) {
      setPlate(editingVehicle.plate);
      setCompany(editingVehicle.company);
      setFleetNumber(editingVehicle.fleetNumber);
      setTypeCode(editingVehicle.typeCode);
      setStatus(editingVehicle.status);
      setSector(editingVehicle.sector);
      setCategory(editingVehicle.category);
      setManufacturer(editingVehicle.manufacturer);
      setModel(editingVehicle.model);
      setOwnership(editingVehicle.ownership);
      setHbFrota(editingVehicle.hbFrota);
      setStatus2(editingVehicle.status2);

      setAxles(editingVehicle.axles);
      setYearFab(editingVehicle.yearFab);
      setYearMod(editingVehicle.yearMod);
      setColor(editingVehicle.color);
      setLogoBrand(editingVehicle.logoBrand);
      setOperationYear(editingVehicle.operationYear);
      setKmOrHours(editingVehicle.kmOrHours);
      setBodywork(editingVehicle.bodywork);
      setTare(editingVehicle.tare);
      setPbt(editingVehicle.pbt);
      setTankCapacity(editingVehicle.tankCapacity);
      setFuelType(editingVehicle.fuelType);
      setCapacityPallets(editingVehicle.capacityPallets);
      setCargoCapacity(editingVehicle.cargoCapacity);

      setRenavam(editingVehicle.renavam);
      setChassi(editingVehicle.chassi);
      setCrlv(editingVehicle.expiryDates.crlv);
      setIpva(editingVehicle.expiryDates.ipva);
      setAntt(editingVehicle.expiryDates.antt);
      setCnt(editingVehicle.expiryDates.cnt);
      setAlvaraSanitario(editingVehicle.expiryDates.alvaraSanitario);
      setExtintorDate(editingVehicle.expiryDates.extintor);
      setExtinguisherSerial(editingVehicle.extinguisherSerial);
      setCronotacografo(editingVehicle.expiryDates.cronotacografo);

      setFipeValue(editingVehicle.fipeValue);
      setCurrentValue(editingVehicle.currentValue);
      setFipeCode(editingVehicle.fipeCode);
      setFleetAgeYears(editingVehicle.fleetAgeYears);
      setReplacementTermYears(editingVehicle.replacementTermYears);
      setReplacementTermKmHours(editingVehicle.replacementTermKmHours);
      setExpectedReplacementMonthYear(editingVehicle.expectedReplacementMonthYear);
      setPurchaseYear(editingVehicle.purchaseYear);
      setFleetAgeYearMonths(editingVehicle.fleetAgeYearMonths);
      setFinalStatus(editingVehicle.finalStatus);

      setChecklist({ ...editingVehicle.checklist });
    } else {
      setPlate('');
      setCompany('Pau Brasil Brejo');
      setFleetNumber('');
      setTypeCode('');
      setStatus('Ativo');
      setSector('Distribuição');
      setCategory('Caminhão');
      setManufacturer('');
      setModel('');
      setOwnership('Próprio');
      setHbFrota(true);
      setStatus2('Ativo');

      setAxles('2');
      setYearFab(2025);
      setYearMod(2025);
      setColor('Branco');
      setLogoBrand('Sim');
      setOperationYear('2025');
      setKmOrHours(0);
      setBodywork('Baú');
      setTare('');
      setPbt('');
      setTankCapacity('300 L');
      setFuelType('Diesel');
      setCapacityPallets('');
      setCargoCapacity('');

      setRenavam('');
      setChassi('');
      setCrlv('');
      setIpva('');
      setAntt('');
      setCnt('');
      setAlvaraSanitario('');
      setExtintorDate('');
      setExtinguisherSerial('');
      setCronotacografo('');

      setFipeValue(0);
      setCurrentValue(0);
      setFipeCode('');
      setFleetAgeYears('0');
      setReplacementTermYears('8');
      setReplacementTermKmHours('500.000 km');
      setExpectedReplacementMonthYear('');
      setPurchaseYear('2025');
      setFleetAgeYearMonths('0a 0m');
      setFinalStatus('Dentro do Prazo');

      setChecklist(
        Object.fromEntries(CHECKLIST_ITEMS.map((item) => [item.key, true])) as Record<
          ChecklistKey,
          boolean
        >
      );
    }
  }, [editingVehicle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = plate.trim().toUpperCase();
    if (cleanPlate.length < 7) {
      setActiveTab('identificacao');
      setError('Informe uma placa válida (ex: QXW-1234 ou ABC1D23).');
      return;
    }
    if (!model.trim() && !manufacturer.trim()) {
      setActiveTab('identificacao');
      setError('Informe ao menos o fabricante ou modelo do veículo.');
      return;
    }

    const combinedModel = [manufacturer.trim(), model.trim()].filter(Boolean).join(' ');

    const vehicleData: Vehicle = {
      id: editingVehicle?.id ?? `veh-${Date.now()}`,
      plate: cleanPlate,
      fleetNumber: fleetNumber.trim() || '-',
      typeCode: typeCode.trim() || category.slice(0, 3).toUpperCase(),
      category,
      sector,
      company,
      status,
      manufacturer: manufacturer.trim() || '-',
      model: model.trim() || combinedModel,
      manufacturerModel: combinedModel,
      axles: axles.trim() || '-',
      yearFab: Number(yearFab) || 2025,
      yearMod: Number(yearMod) || 2025,
      color: color.trim() || '-',
      logoBrand: logoBrand.trim() || '-',
      operationYear: operationYear.trim() || String(yearMod || 2025),
      kmOrHours: Number(kmOrHours) || 0,
      unit: category === 'Empilhadeira' ? 'h' : 'km',
      bodywork: bodywork.trim() || '-',
      tare: tare.trim() || '-',
      pbt: pbt.trim() || '-',
      ownership,
      hbFrota,
      renavam: renavam.trim() || '-',
      chassi: chassi.trim().toUpperCase() || '-',
      extinguisherSerial: extinguisherSerial.trim() || '-',
      tankCapacity: tankCapacity.trim() || '-',
      capacityPallets: capacityPallets.trim() || '-',
      cargoCapacity: cargoCapacity.trim() || '-',
      fuelType: fuelType.trim() || '-',
      status2: status2.trim() || status,
      fipeValue: Number(fipeValue) || 0,
      currentValue: Number(currentValue) || 0,
      fipeCode: fipeCode.trim() || '-',
      fleetAgeYears: fleetAgeYears.trim() || '0',
      replacementTermYears: replacementTermYears.trim() || '-',
      replacementTermKmHours: replacementTermKmHours.trim() || '-',
      expectedReplacementMonthYear: expectedReplacementMonthYear.trim() || '-',
      purchaseYear: purchaseYear.trim() || String(yearFab || 2025),
      fleetAgeYearMonths: fleetAgeYearMonths.trim() || '-',
      finalStatus: finalStatus.trim() || status,
      expiryDates: {
        crlv: crlv.trim() || '-',
        ipva: ipva.trim() || '-',
        antt: antt.trim() || '-',
        cnt: cnt.trim() || '-',
        alvaraSanitario: alvaraSanitario.trim() || '-',
        extintor: extintorDate.trim() || '-',
        cronotacografo: cronotacografo.trim() || '-',
      },
      checklist,
      photoUrl: resolveVehiclePhoto(cleanPlate, category, editingVehicle?.photoUrl),
      periodBucket: editingVehicle?.periodBucket ?? '30d',
      lastUpdated: new Date().toLocaleDateString('pt-BR'),
    };

    onSave(vehicleData, Boolean(editingVehicle));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0A2E5C] text-white">
          <h2 className="font-display text-lg font-bold">
            {editingVehicle ? `Editar Veículo — ${editingVehicle.plate}` : 'Cadastrar Novo Veículo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto bg-slate-50 border-b border-slate-200 px-6 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#0A2E5C] text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'identificacao' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PLACA *
                </label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="QXW-1234"
                  maxLength={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EMPRESA
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value as Company)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0A2E5C] focus:outline-none"
                >
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nº FROTA
                </label>
                <input
                  type="text"
                  value={fleetNumber}
                  onChange={(e) => setFleetNumber(e.target.value)}
                  placeholder="Ex: FR-001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  COD.TIPO
                </label>
                <input
                  type="text"
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value)}
                  placeholder="Ex: CAM"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TIPO (CATEGORIA)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VehicleCategory)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0A2E5C] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SETOR
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as Sector)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0A2E5C] focus:outline-none"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FABRICANTE *
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Ex: Volvo"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MODELO *
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: FH 540"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PRÓPRIO OU TERCEIRO
                </label>
                <select
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value as OwnershipType)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0A2E5C] focus:outline-none"
                >
                  <option value="Próprio">Próprio</option>
                  <option value="Terceiro">Terceiro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  STATUS
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0A2E5C] focus:outline-none"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Parado">Parado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  STATUS2
                </label>
                <input
                  type="text"
                  value={status2}
                  onChange={(e) => setStatus2(e.target.value)}
                  placeholder="Ex: Operacional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hbFrota}
                    onChange={(e) => setHbFrota(e.target.checked)}
                    className="rounded border-slate-300 text-[#0A2E5C]"
                  />
                  Integrado ao HBFrota
                </label>
              </div>
            </div>
          )}

          {activeTab === 'especificacoes' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nº EIXOS
                </label>
                <input
                  type="text"
                  value={axles}
                  onChange={(e) => setAxles(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ANO FABRICAÇÃO
                </label>
                <input
                  type="number"
                  value={yearFab}
                  onChange={(e) => setYearFab(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ANO MODELO
                </label>
                <input
                  type="number"
                  value={yearMod}
                  onChange={(e) => setYearMod(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  COR
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LOGOMARCA
                </label>
                <input
                  type="text"
                  value={logoBrand}
                  onChange={(e) => setLogoBrand(e.target.value)}
                  placeholder="Sim / Não"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ANO OPERAÇÃO
                </label>
                <input
                  type="text"
                  value={operationYear}
                  onChange={(e) => setOperationYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KM/HORAS ATUAL
                </label>
                <input
                  type="number"
                  value={kmOrHours}
                  onChange={(e) => setKmOrHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CARROCERIA
                </label>
                <input
                  type="text"
                  value={bodywork}
                  onChange={(e) => setBodywork(e.target.value)}
                  placeholder="Baú / Sider / Aberta"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TARA
                </label>
                <input
                  type="text"
                  value={tare}
                  onChange={(e) => setTare(e.target.value)}
                  placeholder="Ex: 8.500 kg"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PBT
                </label>
                <input
                  type="text"
                  value={pbt}
                  onChange={(e) => setPbt(e.target.value)}
                  placeholder="Ex: 23.000 kg"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CAPACIDADE DO TANQUE COMB
                </label>
                <input
                  type="text"
                  value={tankCapacity}
                  onChange={(e) => setTankCapacity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  COMBUSTÍVEL
                </label>
                <input
                  type="text"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CAPACIDADE (Pallets)
                </label>
                <input
                  type="text"
                  value={capacityPallets}
                  onChange={(e) => setCapacityPallets(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CAPACIDADE CAIXAS / PESO
                </label>
                <input
                  type="text"
                  value={cargoCapacity}
                  onChange={(e) => setCargoCapacity(e.target.value)}
                  placeholder="Ex: 32.000 kg"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RENAVAM
                </label>
                <input
                  type="text"
                  value={renavam}
                  onChange={(e) => setRenavam(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CHASSIS
                </label>
                <input
                  type="text"
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VENCIMENTO CRLV
                </label>
                <input
                  type="text"
                  value={crlv}
                  onChange={(e) => setCrlv(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VENCIMENTO IPVA
                </label>
                <input
                  type="text"
                  value={ipva}
                  onChange={(e) => setIpva(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VENCIMENTO ANTT
                </label>
                <input
                  type="text"
                  value={antt}
                  onChange={(e) => setAntt(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VENCIMENTO CNT
                </label>
                <input
                  type="text"
                  value={cnt}
                  onChange={(e) => setCnt(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VENCIMENTO ALVARÁ VIGILÂNCIA SANITÁRIA
                </label>
                <input
                  type="text"
                  value={alvaraSanitario}
                  onChange={(e) => setAlvaraSanitario(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VENCIMENTO EXTINTOR
                </label>
                <input
                  type="text"
                  value={extintorDate}
                  onChange={(e) => setExtintorDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nº SÉRIE EXTINTOR
                </label>
                <input
                  type="text"
                  value={extinguisherSerial}
                  onChange={(e) => setExtinguisherSerial(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CRONOTACÓGRAFO
                </label>
                <input
                  type="text"
                  value={cronotacografo}
                  onChange={(e) => setCronotacografo(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
            </div>
          )}

          {activeTab === 'fipe' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VALOR TABELA FIPE (NOVO) (R$)
                </label>
                <input
                  type="number"
                  value={fipeValue}
                  onChange={(e) => setFipeValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VALOR ATUAL (R$)
                </label>
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  COD. FIPE
                </label>
                <input
                  type="text"
                  value={fipeCode}
                  onChange={(e) => setFipeCode(e.target.value)}
                  placeholder="Ex: 005123-4"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IDADE FROTA EM ANOS
                </label>
                <input
                  type="text"
                  value={fleetAgeYears}
                  onChange={(e) => setFleetAgeYears(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PRAZO PARA TROCA EM ANOS
                </label>
                <input
                  type="text"
                  value={replacementTermYears}
                  onChange={(e) => setReplacementTermYears(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PRAZO PARA TROCA EM KM/HORA
                </label>
                <input
                  type="text"
                  value={replacementTermKmHours}
                  onChange={(e) => setReplacementTermKmHours(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MÊS / ANO PREVISTO PARA TROCA
                </label>
                <input
                  type="text"
                  value={expectedReplacementMonthYear}
                  onChange={(e) => setExpectedReplacementMonthYear(e.target.value)}
                  placeholder="Ex: 12/2032"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ANO COMPRA
                </label>
                <input
                  type="text"
                  value={purchaseYear}
                  onChange={(e) => setPurchaseYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IDADE FROTA ANO / MESES
                </label>
                <input
                  type="text"
                  value={fleetAgeYearMonths}
                  onChange={(e) => setFleetAgeYearMonths(e.target.value)}
                  placeholder="Ex: 2a 4m"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  STATUS (TROCA / SITUAÇÃO FINAL)
                </label>
                <input
                  type="text"
                  value={finalStatus}
                  onChange={(e) => setFinalStatus(e.target.value)}
                  placeholder="Ex: Dentro do Prazo / Troca Prevista"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-semibold cursor-pointer ${
                    checklist[item.key]
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() =>
                      setChecklist((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key],
                      }))
                    }
                    className="rounded border-slate-300 text-[#0A2E5C]"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500">
              Navegue pelas abas acima para preencher todas as colunas da planilha.
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
