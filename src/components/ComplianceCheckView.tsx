import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  ComplianceCheckRecord,
  ComplianceDocStatus,
  ComplianceMonth,
  ComplianceOperation,
  Vehicle,
} from '../types/fleet';

export const COMPLIANCE_MONTHS: ComplianceMonth[] = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

export const INITIAL_COMPLIANCE_CHECKS: ComplianceCheckRecord[] = [
  {
    id: 'chk-jan-slb4a26',
    month: 'JANEIRO',
    operation: 'ENTREGA',
    checkDate: '05/01/2026',
    unit: 'Guarabira',
    plate: 'SLB4A26',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-slb4a56',
    month: 'JANEIRO',
    operation: 'ENTREGA',
    checkDate: '05/01/2026',
    unit: 'Guarabira',
    plate: 'SLB4A56',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-tou7f39',
    month: 'JANEIRO',
    operation: 'ENTREGA',
    checkDate: '07/01/2026',
    unit: 'Guarabira',
    plate: 'TOU7F39',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-toz8b20',
    month: 'JANEIRO',
    operation: 'ENTREGA',
    checkDate: '06/01/2026',
    unit: 'Guarabira',
    plate: 'TOZ8B20',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-toz8b50',
    month: 'JANEIRO',
    operation: 'ENTREGA',
    checkDate: '05/01/2026',
    unit: 'Guarabira',
    plate: 'TOZ8B50',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-rlt5j44',
    month: 'JANEIRO',
    operation: 'PUXADA',
    checkDate: '09/01/2026',
    unit: 'Guarabira',
    plate: 'RLT5J44',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-rlt5j54',
    month: 'JANEIRO',
    operation: 'PUXADA',
    checkDate: '09/01/2026',
    unit: 'Guarabira',
    plate: 'RLT5J54',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-rlu3f59',
    month: 'JANEIRO',
    operation: 'PUXADA',
    checkDate: '09/01/2026',
    unit: 'Guarabira',
    plate: 'RLU3F59',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-mom7962',
    month: 'JANEIRO',
    operation: 'PUXADA',
    checkDate: '09/01/2026',
    unit: 'Guarabira',
    plate: 'MOM7962',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-npt1753',
    month: 'JANEIRO',
    operation: 'PUXADA',
    checkDate: '09/01/2026',
    unit: 'Guarabira',
    plate: 'NPT1753',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
  {
    id: 'chk-jan-ofh7150',
    month: 'JANEIRO',
    operation: 'PUXADA',
    checkDate: '09/01/2026',
    unit: 'Guarabira',
    plate: 'OFH7150',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  },
];

type DocFieldKey = 'crlvAno' | 'cronotacografo' | 'antt' | 'contratoLocacao';

const DOC_COLUMNS: { key: DocFieldKey; label: string; shortLabel: string }[] = [
  { key: 'crlvAno', label: 'CRLV DO ANO', shortLabel: 'CRLV do Ano' },
  {
    key: 'cronotacografo',
    label: 'CERTIFICADO CRONOTACÓGRAFO',
    shortLabel: 'Cronotacógrafo',
  },
  { key: 'antt', label: 'CERTIFICADO DA ANTT', shortLabel: 'ANTT' },
  {
    key: 'contratoLocacao',
    label: 'CONTRATO DE LOCAÇÃO',
    shortLabel: 'Contrato Locação',
  },
];

export function computeRecordCompliancePct(rec: ComplianceCheckRecord): number {
  const statuses: ComplianceDocStatus[] = [
    rec.crlvAno,
    rec.cronotacografo,
    rec.antt,
    rec.contratoLocacao,
  ];
  const applicable = statuses.filter((s) => s !== 'N/A');
  if (applicable.length === 0) return 100;
  const okCount = applicable.filter((s) => s === 'OK').length;
  return (okCount / applicable.length) * 100;
}

function formatPct(pct: number): string {
  return `${pct.toFixed(1).replace('.', ',')}%`;
}

function nextDocStatus(current: ComplianceDocStatus): ComplianceDocStatus {
  if (current === 'OK') return 'NOK';
  if (current === 'NOK') return 'N/A';
  return 'OK';
}

function inferOperationFromVehicle(v: Vehicle): ComplianceOperation {
  if (v.sector === 'Puxada' || v.category === 'Tração Caminhão Trator' || v.category === 'Carga Semi-Reboque') {
    return 'PUXADA';
  }
  if (v.category === 'Frota Leve' || v.sector === 'Vendas' || v.sector === 'Marketing') {
    return 'FROTA LEVE';
  }
  return 'ENTREGA';
}

function todayBr(): string {
  return new Date().toLocaleDateString('pt-BR');
}

interface ComplianceCheckViewProps {
  records: ComplianceCheckRecord[];
  vehicles: Vehicle[];
  onAddRecords: (items: ComplianceCheckRecord[]) => void;
  onUpdateRecord: (id: string, patch: Partial<ComplianceCheckRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

interface ModalFormState {
  operation: ComplianceOperation;
  checkDate: string;
  unit: string;
  plate: string;
  crlvAno: ComplianceDocStatus;
  cronotacografo: ComplianceDocStatus;
  antt: ComplianceDocStatus;
  contratoLocacao: ComplianceDocStatus;
  notes: string;
}

export const ComplianceCheckView: React.FC<ComplianceCheckViewProps> = ({
  records,
  vehicles,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<ComplianceMonth>('JANEIRO');
  const [search, setSearch] = useState('');
  const [operationFilter, setOperationFilter] = useState<'TODAS' | ComplianceOperation>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'CONFORMES' | 'NAO_CONFORMES'>('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ComplianceCheckRecord | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [form, setForm] = useState<ModalFormState>({
    operation: 'ENTREGA',
    checkDate: todayBr(),
    unit: 'Guarabira',
    plate: '',
    crlvAno: 'OK',
    cronotacografo: 'OK',
    antt: 'OK',
    contratoLocacao: 'OK',
    notes: '',
  });

  const showNotice = (msg: string) => {
    setFeedbackMsg(msg);
    window.setTimeout(() => {
      setFeedbackMsg((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const monthCounts = useMemo(() => {
    const counts: Record<ComplianceMonth, { total: number; nonCompliant: number }> = {
      JANEIRO: { total: 0, nonCompliant: 0 },
      FEVEREIRO: { total: 0, nonCompliant: 0 },
      MARÇO: { total: 0, nonCompliant: 0 },
      ABRIL: { total: 0, nonCompliant: 0 },
      MAIO: { total: 0, nonCompliant: 0 },
      JUNHO: { total: 0, nonCompliant: 0 },
      JULHO: { total: 0, nonCompliant: 0 },
      AGOSTO: { total: 0, nonCompliant: 0 },
      SETEMBRO: { total: 0, nonCompliant: 0 },
      OUTUBRO: { total: 0, nonCompliant: 0 },
      NOVEMBRO: { total: 0, nonCompliant: 0 },
      DEZEMBRO: { total: 0, nonCompliant: 0 },
    };
    for (const r of records) {
      if (!counts[r.month]) continue;
      counts[r.month].total += 1;
      if (computeRecordCompliancePct(r) < 100) {
        counts[r.month].nonCompliant += 1;
      }
    }
    return counts;
  }, [records]);

  const monthRecords = useMemo(
    () => records.filter((r) => r.month === selectedMonth),
    [records, selectedMonth]
  );

  const monthMetrics = useMemo(() => {
    const total = monthRecords.length;
    if (total === 0) {
      return { total: 0, avgPct: 0, compliant: 0, nonCompliant: 0 };
    }
    let sumPct = 0;
    let compliant = 0;
    let nonCompliant = 0;
    for (const r of monthRecords) {
      const pct = computeRecordCompliancePct(r);
      sumPct += pct;
      if (pct >= 100) compliant += 1;
      else nonCompliant += 1;
    }
    return {
      total,
      avgPct: sumPct / total,
      compliant,
      nonCompliant,
    };
  }, [monthRecords]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthRecords.filter((r) => {
      if (operationFilter !== 'TODAS' && r.operation !== operationFilter) {
        return false;
      }
      const pct = computeRecordCompliancePct(r);
      if (statusFilter === 'CONFORMES' && pct < 100) return false;
      if (statusFilter === 'NAO_CONFORMES' && pct >= 100) return false;
      if (q) {
        const hay = `${r.plate} ${r.operation} ${r.unit} ${r.checkDate} ${r.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthRecords, operationFilter, statusFilter, search]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm({
      operation: 'ENTREGA',
      checkDate: todayBr(),
      unit: 'Guarabira',
      plate: '',
      crlvAno: 'OK',
      cronotacografo: 'OK',
      antt: 'OK',
      contratoLocacao: 'OK',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (rec: ComplianceCheckRecord) => {
    setEditingRecord(rec);
    setForm({
      operation: rec.operation,
      checkDate: rec.checkDate,
      unit: rec.unit,
      plate: rec.plate,
      crlvAno: rec.crlvAno,
      cronotacografo: rec.cronotacografo,
      antt: rec.antt,
      contratoLocacao: rec.contratoLocacao,
      notes: rec.notes,
    });
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = form.plate.replace(/[^A-Z0-9-]/gi, '').toUpperCase().trim();
    if (!cleanPlate) return;

    if (editingRecord) {
      onUpdateRecord(editingRecord.id, {
        operation: form.operation,
        checkDate: form.checkDate.trim() || todayBr(),
        unit: form.unit.trim() || 'Guarabira',
        plate: cleanPlate,
        crlvAno: form.crlvAno,
        cronotacografo: form.cronotacografo,
        antt: form.antt,
        contratoLocacao: form.contratoLocacao,
        notes: form.notes.trim(),
      });
      showNotice(`Check da placa ${cleanPlate} atualizado em ${selectedMonth}.`);
    } else {
      const newRecord: ComplianceCheckRecord = {
        id: `chk-${selectedMonth.toLowerCase()}-${cleanPlate.toLowerCase()}-${Date.now()}`,
        month: selectedMonth,
        operation: form.operation,
        checkDate: form.checkDate.trim() || todayBr(),
        unit: form.unit.trim() || 'Guarabira',
        plate: cleanPlate,
        crlvAno: form.crlvAno,
        cronotacografo: form.cronotacografo,
        antt: form.antt,
        contratoLocacao: form.contratoLocacao,
        notes: form.notes.trim(),
      };
      onAddRecords([newRecord]);
      showNotice(`Placa ${cleanPlate} adicionada ao check de ${selectedMonth}.`);
    }
    setModalOpen(false);
    setEditingRecord(null);
  };

  const handleCopyPreviousMonth = () => {
    const idx = COMPLIANCE_MONTHS.indexOf(selectedMonth);
    const sourceMonth = idx > 0 ? COMPLIANCE_MONTHS[idx - 1] : 'JANEIRO';
    const sourceRows = records.filter((r) => r.month === sourceMonth);
    if (sourceRows.length === 0) {
      showNotice(`Não há registros em ${sourceMonth} para copiar.`);
      return;
    }
    const existingPlates = new Set(
      monthRecords.map((r) => r.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    );
    const dateNow = todayBr();
    const toCreate: ComplianceCheckRecord[] = sourceRows
      .filter((r) => !existingPlates.has(r.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase()))
      .map((r, i) => ({
        ...r,
        id: `chk-${selectedMonth.toLowerCase()}-${r.plate.toLowerCase()}-${Date.now()}-${i}`,
        month: selectedMonth,
        checkDate: dateNow,
      }));
    if (toCreate.length === 0) {
      showNotice(`Todas as placas de ${sourceMonth} já estão em ${selectedMonth}.`);
      return;
    }
    onAddRecords(toCreate);
    showNotice(`${toCreate.length} placas copiadas de ${sourceMonth} para ${selectedMonth}.`);
  };

  const handleImportFleetVehicles = () => {
    const existingPlates = new Set(
      monthRecords.map((r) => r.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    );
    const dateNow = todayBr();
    const toCreate: ComplianceCheckRecord[] = vehicles
      .filter((v) => !existingPlates.has(v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase()))
      .map((v, i) => {
        const op = inferOperationFromVehicle(v);
        const isLight = op === 'FROTA LEVE';
        return {
          id: `chk-${selectedMonth.toLowerCase()}-${v.plate.toLowerCase()}-${Date.now()}-${i}`,
          month: selectedMonth,
          operation: op,
          checkDate: dateNow,
          unit: 'Guarabira',
          plate: v.plate.toUpperCase(),
          crlvAno: 'OK',
          cronotacografo: isLight ? 'N/A' : 'OK',
          antt: isLight ? 'N/A' : 'OK',
          contratoLocacao: v.ownership === 'Terceiro' ? 'OK' : 'N/A',
          notes: '',
        };
      });
    if (toCreate.length === 0) {
      showNotice(`Todos os veículos cadastrados já constam no check de ${selectedMonth}.`);
      return;
    }
    onAddRecords(toCreate);
    showNotice(`${toCreate.length} veículos da frota carregados em ${selectedMonth}.`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const monthsWithData = COMPLIANCE_MONTHS.filter(
      (m) => m === selectedMonth || records.some((r) => r.month === m)
    );
    const targetMonths = monthsWithData.length > 0 ? monthsWithData : [selectedMonth];

    for (const month of targetMonths) {
      const rows = records
        .filter((r) => r.month === month)
        .map((r) => ({
          OPERAÇÃO: r.operation,
          DATA: r.checkDate,
          UNIDADE: r.unit,
          PLACA: r.plate,
          'DOCUMENTOS OBRIGATÓRIOS': formatPct(computeRecordCompliancePct(r)),
          'CRLV DO ANO': r.crlvAno,
          'CERTIFICADO CRONOTACÓGRAFO': r.cronotacografo,
          'CERTIFICADO DA ANTT': r.antt,
          'CONTRATO DE LOCAÇÃO': r.contratoLocacao,
          OBSERVAÇÃO: r.notes || '',
        }));

      const ws = XLSX.utils.json_to_sheet(
        rows.length > 0
          ? rows
          : [
              {
                OPERAÇÃO: '',
                DATA: '',
                UNIDADE: '',
                PLACA: '',
                'DOCUMENTOS OBRIGATÓRIOS': '0,0%',
                'CRLV DO ANO': '',
                'CERTIFICADO CRONOTACÓGRAFO': '',
                'CERTIFICADO DA ANTT': '',
                'CONTRATO DE LOCAÇÃO': '',
                OBSERVAÇÃO: '',
              },
            ]
      );
      ws['!cols'] = [
        { wch: 14 },
        { wch: 13 },
        { wch: 14 },
        { wch: 12 },
        { wch: 24 },
        { wch: 15 },
        { wch: 26 },
        { wch: 22 },
        { wch: 22 },
        { wch: 28 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, month.slice(0, 31));
    }

    XLSX.writeFile(wb, `1.1.5_Check_Documentacao_Fora_Conformidade_${selectedMonth}.xlsx`);
    showNotice('Planilha Excel exportada com sucesso.');
  };

  const renderDocCell = (rec: ComplianceCheckRecord, field: DocFieldKey) => {
    const val = rec[field];
    const styles =
      val === 'OK'
        ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
        : val === 'NOK'
          ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300';

    return (
      <button
        type="button"
        onClick={() => onUpdateRecord(rec.id, { [field]: nextDocStatus(val) })}
        title={`Clique para alternar status (Atual: ${val} → Próximo: ${nextDocStatus(val)})`}
        className={`w-full min-w-[68px] py-1.5 px-2.5 rounded-lg border text-xs font-extrabold tracking-wide transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565D8] ${styles}`}
      >
        {val}
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-3.5 py-0.5">
      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Resumo do Check de Conformidade">
        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_2px_10px_rgba(6,41,90,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-slate-500">
              Veículos Checados ({selectedMonth})
            </span>
            <ClipboardCheck className="w-4 h-4 text-[#1256BA] shrink-0" />
          </div>
          <div className="font-mono-tabular text-2xl font-extrabold text-[#06295A] mt-1">
            {String(monthMetrics.total).padStart(2, '0')}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/90 px-4 py-3 shadow-[0_2px_10px_rgba(6,41,90,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-slate-500">
              Documentos Obrigatórios
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="font-mono-tabular text-2xl font-extrabold text-[#06295A] mt-1">
            {formatPct(monthMetrics.avgPct)}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) => (prev === 'CONFORMES' ? 'TODOS' : 'CONFORMES'))
          }
          className={`text-left rounded-xl border px-4 py-3 shadow-[0_2px_10px_rgba(6,41,90,0.04)] transition-all cursor-pointer ${
            statusFilter === 'CONFORMES'
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/50'
              : 'bg-white border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-slate-500">
              100% Conformes
            </span>
            <span className="text-[11px] font-bold text-emerald-700">OK</span>
          </div>
          <div className="font-mono-tabular text-2xl font-extrabold text-emerald-700 mt-1">
            {String(monthMetrics.compliant).padStart(2, '0')}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === 'NAO_CONFORMES' ? 'TODOS' : 'NAO_CONFORMES'
            )
          }
          className={`text-left rounded-xl border px-4 py-3 shadow-[0_2px_10px_rgba(6,41,90,0.04)] transition-all cursor-pointer ${
            statusFilter === 'NAO_CONFORMES'
              ? 'bg-red-50 border-red-400 ring-1 ring-red-400/50'
              : 'bg-white border-slate-200/90 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-slate-500">
              Fora de Conformidade
            </span>
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          </div>
          <div className="font-mono-tabular text-2xl font-extrabold text-red-600 mt-1">
            {String(monthMetrics.nonCompliant).padStart(2, '0')}
          </div>
        </button>
      </section>

      {/* Main Matrix Workspace Card */}
      <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Navy Header Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[0.98rem] font-extrabold tracking-tight text-white">
              1.1.5 CHECK DOCUMENTAÇÃO FORA DE CONFORMIDADE — {selectedMonth}
            </h2>
            <p className="text-[0.74rem] text-blue-100/85 mt-0.5">
              Clique em qualquer célula (OK / NOK / N/A) para atualizar instantaneamente o índice de conformidade do veículo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {selectedMonth !== 'JANEIRO' && (
              <button
                type="button"
                onClick={handleCopyPreviousMonth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar mês anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleImportFleetVehicles}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Carregar Frota</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#06295A] text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Check</span>
            </button>
          </div>
        </div>

        {/* Monthly Tabs Strip (JANEIRO -> DEZEMBRO) */}
        <div className="px-4 py-2 bg-[#F4F8FD] border-b border-slate-200/90 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max" role="tablist" aria-label="Meses do ano">
            {COMPLIANCE_MONTHS.map((month) => {
              const active = selectedMonth === month;
              const stats = monthCounts[month];
              return (
                <button
                  key={month}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedMonth(month)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#0B3C7D] text-white shadow-[0_2px_6px_rgba(11,60,125,0.28)]'
                      : 'text-slate-600 hover:bg-white hover:text-[#06295A]'
                  }`}
                >
                  <span>{month}</span>
                  {stats.total > 0 && (
                    <span
                      className={`font-mono-tabular text-[10.5px] font-bold ${
                        active
                          ? 'text-blue-200'
                          : stats.nonCompliant > 0
                            ? 'text-red-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      ({stats.total})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & Feedback Row */}
        <div className="px-4 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 bg-white">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar placa, base ou observação..."
                className="w-full h-9 pl-8 pr-8 rounded-lg border border-slate-200 text-xs font-medium text-[#06295A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              {(['TODAS', 'ENTREGA', 'PUXADA', 'FROTA LEVE'] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOperationFilter(op)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    operationFilter === op
                      ? 'bg-white text-[#06295A] shadow-xs'
                      : 'text-slate-600 hover:text-[#06295A]'
                  }`}
                >
                  {op === 'TODAS' ? 'Todas Operações' : op}
                </button>
              ))}
            </div>

            {statusFilter !== 'TODOS' && (
              <button
                type="button"
                onClick={() => setStatusFilter('TODOS')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0B3C7D] text-[11px] font-bold hover:bg-blue-100 cursor-pointer"
              >
                <span>
                  Filtro: {statusFilter === 'CONFORMES' ? '100% Conformes' : 'Fora de Conformidade'}
                </span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> OK = Conforme
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> NOK = Pendência
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300" /> N/A
            </span>
          </div>
        </div>

        {feedbackMsg && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
            <span>{feedbackMsg}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto">
          {filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-[#06295A]">
                Nenhum check registrado para {selectedMonth}
                {search || operationFilter !== 'TODAS' || statusFilter !== 'TODOS'
                  ? ' com os filtros atuais'
                  : ''}.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Adicione um novo registro, copie o mês anterior ou carregue todos os veículos cadastrados na frota.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B3C7D] text-white text-xs font-bold hover:bg-[#1256BA] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Check</span>
                </button>
                {selectedMonth === 'JANEIRO' && monthRecords.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddRecords(INITIAL_COMPLIANCE_CHECKS);
                      showNotice(
                        `${INITIAL_COMPLIANCE_CHECKS.length} registros iniciais de JANEIRO gravados no banco de dados.`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Carregar Base Janeiro (11 placas)</span>
                  </button>
                )}
                {selectedMonth !== 'JANEIRO' && (
                  <button
                    type="button"
                    onClick={handleCopyPreviousMonth}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-[#06295A] text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar mês anterior</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EEF4FC] border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wide text-[#06295A]">
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Operação</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Unidade</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Placa</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap bg-[#DCE8F8]">
                    Docs. Obrigatórios
                  </th>
                  {DOC_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="py-2.5 px-2.5 text-center whitespace-nowrap"
                      title={col.label}
                    >
                      {col.shortLabel}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 whitespace-nowrap">Observação</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRows.map((rec) => {
                  const pct = computeRecordCompliancePct(rec);
                  const isCompliant = pct >= 100;
                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors ${
                        isCompliant
                          ? 'hover:bg-[#F7FAFE]'
                          : 'bg-red-50/40 hover:bg-red-50/80'
                      }`}
                    >
                      <td className="py-2 px-3.5 font-bold text-[#06295A] whitespace-nowrap">
                        {rec.operation}
                      </td>
                      <td className="py-2 px-3 font-mono-tabular font-semibold text-slate-700 whitespace-nowrap">
                        {rec.checkDate}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {rec.unit}
                      </td>
                      <td className="py-2 px-3 font-mono-tabular font-extrabold text-[#06295A] whitespace-nowrap">
                        {rec.plate}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-mono-tabular font-extrabold whitespace-nowrap ${
                          isCompliant
                            ? 'bg-slate-100/80 text-[#06295A]'
                            : 'bg-red-100/80 text-red-700'
                        }`}
                      >
                        {formatPct(pct)}
                      </td>
                      {DOC_COLUMNS.map((col) => (
                        <td key={col.key} className="py-1.5 px-2 text-center">
                          {renderDocCell(rec, col.key)}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate">
                        {rec.notes || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            title="Editar check"
                            aria-label={`Editar check da placa ${rec.plate}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1256BA] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(rec.id)}
                            title="Remover linha"
                            aria-label={`Remover check da placa ${rec.plate}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Add / Edit Check Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px] p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-extrabold text-white">
                  {editingRecord ? 'Editar Check Documental' : 'Novo Check Documental'}
                </h3>
                <p className="text-xs text-blue-100/85">
                  Mês de referência: {selectedMonth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar modal"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    required
                    list="compliance-fleet-plates"
                    value={form.plate}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const found = vehicles.find(
                        (v) => v.plate.toUpperCase() === val.trim()
                      );
                      setForm((prev) => ({
                        ...prev,
                        plate: val,
                        operation: found ? inferOperationFromVehicle(found) : prev.operation,
                      }));
                    }}
                    placeholder="Ex: SLB4A26"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono-tabular text-xs font-bold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                  <datalist id="compliance-fleet-plates">
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — {v.manufacturerModel}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Operação
                  </label>
                  <select
                    value={form.operation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        operation: e.target.value as ComplianceOperation,
                      }))
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-[#06295A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  >
                    <option value="ENTREGA">ENTREGA</option>
                    <option value="PUXADA">PUXADA</option>
                    <option value="FROTA LEVE">FROTA LEVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Data do Check
                  </label>
                  <input
                    type="text"
                    value={form.checkDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, checkDate: e.target.value }))
                    }
                    placeholder="DD/MM/AAAA"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono-tabular text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#06295A] mb-1">
                    Unidade / Base
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="Guarabira"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#06295A] mb-2">
                  Documentos Obrigatórios
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DOC_COLUMNS.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/70"
                    >
                      <span className="text-[11px] font-bold text-[#06295A] truncate">
                        {col.shortLabel}
                      </span>
                      <select
                        value={form[col.key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [col.key]: e.target.value as ComplianceDocStatus,
                          }))
                        }
                        className="h-7 px-2 rounded-md border border-slate-300 bg-white text-xs font-bold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                      >
                        <option value="OK">OK</option>
                        <option value="NOK">NOK</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#06295A] mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ex: Aguardando renovação do cronotacógrafo..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white text-xs font-bold hover:brightness-110 cursor-pointer"
                >
                  {editingRecord ? 'Salvar Alterações' : 'Registrar Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
