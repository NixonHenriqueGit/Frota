import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilePlus2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  DocumentStatus,
  DocumentType,
  Vehicle,
  VehicleDocumentRecord,
} from '../types/fleet';
import { DOCUMENT_TYPES } from '../data/fleetSeed';
import { DocumentStatusBadge } from './StatusBadges';

interface DocumentsViewProps {
  documents: VehicleDocumentRecord[];
  vehicles: Vehicle[];
  onUpdateDocument: (docId: string, status: DocumentStatus, expiryDate: string) => void;
  onAddDocument: (doc: VehicleDocumentRecord) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  vehicles,
  onUpdateDocument,
  onAddDocument,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | DocumentType>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | DocumentStatus>('Todos');

  const [renewTarget, setRenewTarget] = useState<VehicleDocumentRecord | null>(null);
  const [renewDate, setRenewDate] = useState('15/12/2027');
  const [renewStatus, setRenewStatus] = useState<DocumentStatus>('Regular');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicleId, setNewVehicleId] = useState(vehicles[0]?.id ?? '');
  const [newType, setNewType] = useState<DocumentType>('CRLV');
  const [newStatus, setNewStatus] = useState<DocumentStatus>('Regular');
  const [newExpiry, setNewExpiry] = useState('31/12/2027');
  const [newProtocol, setNewProtocol] = useState('');

  const counts = useMemo(() => {
    return {
      regular: documents.filter((d) => d.status === 'Regular').length,
      expiring: documents.filter((d) => d.status === 'A vencer').length,
      expired: documents.filter((d) => d.status === 'Vencido').length,
    };
  }, [documents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (typeFilter !== 'Todos' && d.type !== typeFilter) return false;
      if (statusFilter !== 'Todos' && d.status !== statusFilter) return false;
      if (q) {
        return (
          d.plate.toLowerCase().includes(q) ||
          d.model.toLowerCase().includes(q) ||
          d.protocol.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, search, typeFilter, statusFilter]);

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === newVehicleId) ?? vehicles[0];
    if (!veh) return;
    onAddDocument({
      id: `doc-${Date.now()}`,
      vehicleId: veh.id,
      plate: veh.plate,
      model: veh.manufacturerModel,
      sector: veh.sector,
      type: newType,
      status: newStatus,
      expiryDate: newExpiry || '31/12/2027',
      protocol: newProtocol.trim() || `PROT-${Math.floor(10000 + Math.random() * 90000)}`,
      responsible: 'Gestão Brejo',
    });
    setShowAddModal(false);
    setNewProtocol('');
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Regular' ? 'Todos' : 'Regular')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            statusFilter === 'Regular'
              ? 'bg-emerald-50 border-emerald-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500">Regulares</span>
            <div className="font-display text-2xl font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {counts.regular}
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'A vencer' ? 'Todos' : 'A vencer')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            statusFilter === 'A vencer'
              ? 'bg-amber-50 border-amber-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500">A vencer (30 dias)</span>
            <div className="font-display text-2xl font-extrabold text-amber-600 tabular-nums mt-0.5">
              {counts.expiring}
            </div>
          </div>
          <Clock className="w-8 h-8 text-amber-500" />
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Vencido' ? 'Todos' : 'Vencido')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            statusFilter === 'Vencido'
              ? 'bg-red-50 border-red-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500">Vencidos</span>
            <div className="font-display text-2xl font-extrabold text-red-600 tabular-nums mt-0.5">
              {counts.expired}
            </div>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa, modelo ou protocolo..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0A2E5C] focus:outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'Todos' | DocumentType)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#0A2E5C] focus:outline-none"
          >
            <option value="Todos">Todos os Documentos</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | DocumentStatus)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#0A2E5C] focus:outline-none"
          >
            <option value="Todos">Todas Situações</option>
            <option value="Regular">Regular</option>
            <option value="A vencer">A vencer</option>
            <option value="Vencido">Vencido</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Lançar Documento</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-[#0A2E5C] text-white flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">
            Vencimentos e Certidões ({filtered.length} registros)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">Veículo</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3">Documento</th>
                <th className="py-2.5 px-3">Protocolo</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3">Situação</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Nenhum documento cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono-tabular font-bold text-[#0A2E5C] whitespace-nowrap">
                      {doc.plate}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                      {doc.model}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {doc.sector}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {doc.type}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {doc.protocol}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-800 whitespace-nowrap">
                      {doc.expiryDate}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setRenewTarget(doc);
                          setRenewDate('15/12/2027');
                          setRenewStatus('Regular');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-[#0A2E5C] text-xs font-semibold text-[#0A2E5C] hover:bg-blue-50/60 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Atualizar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Modal */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2E5C] text-white">
              <h3 className="font-display text-sm font-bold">
                Atualizar {renewTarget.type} — {renewTarget.plate}
              </h3>
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateDocument(renewTarget.id, renewStatus, renewDate);
                setRenewTarget(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Data de Vencimento
                </label>
                <input
                  type="text"
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular focus:border-[#0A2E5C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Situação Documental
                </label>
                <select
                  value={renewStatus}
                  onChange={(e) => setRenewStatus(e.target.value as DocumentStatus)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0A2E5C] focus:outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="A vencer">A vencer</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenewTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0A2E5C] text-white text-xs font-semibold cursor-pointer"
                >
                  Salvar Renovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2E5C] text-white">
              <h3 className="font-display text-sm font-bold">Lançar Novo Documento</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDoc} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Veículo
                </label>
                <select
                  value={newVehicleId}
                  onChange={(e) => setNewVehicleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.manufacturerModel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as DocumentType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Situação
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as DocumentStatus)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Regular">Regular</option>
                    <option value="A vencer">A vencer</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vencimento
                  </label>
                  <input
                    type="text"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Protocolo
                  </label>
                  <input
                    type="text"
                    value={newProtocol}
                    onChange={(e) => setNewProtocol(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0A2E5C] text-white text-xs font-semibold cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
