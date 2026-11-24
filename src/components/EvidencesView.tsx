import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileCheck2,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { VehicleEvidenceRecord } from '../types/fleet';
import { EvidenceStatusBadge } from './StatusBadges';

interface EvidencesViewProps {
  evidences: VehicleEvidenceRecord[];
  onToggleEvidenceField: (
    vehicleId: string,
    field: 'crlv' | 'cnt' | 'antt',
    fileName?: string
  ) => void;
}

export const EvidencesView: React.FC<EvidencesViewProps> = ({
  evidences,
  onToggleEvidenceField,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Anexado' | 'Pendente'>('Todos');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<{
    vehicleId: string;
    field: 'crlv' | 'cnt' | 'antt';
  } | null>(null);

  const stats = useMemo(() => {
    const complete = evidences.filter((e) => e.crlv && e.cnt && e.antt).length;
    return {
      total: evidences.length,
      complete,
      pending: evidences.length - complete,
    };
  }, [evidences]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evidences.filter((e) => {
      const complete = e.crlv && e.cnt && e.antt;
      if (statusFilter === 'Anexado' && !complete) return false;
      if (statusFilter === 'Pendente' && complete) return false;
      if (q) {
        return (
          e.plate.toLowerCase().includes(q) ||
          e.model.toLowerCase().includes(q) ||
          e.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [evidences, search, statusFilter]);

  const triggerFileUpload = (vehicleId: string, field: 'crlv' | 'cnt' | 'antt') => {
    setPendingUploadTarget({ vehicleId, field });
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingUploadTarget) {
            onToggleEvidenceField(
              pendingUploadTarget.vehicleId,
              pendingUploadTarget.field,
              file.name
            );
          }
          e.target.value = '';
          setPendingUploadTarget(null);
        }}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Monitorado
            </span>
            <div className="font-display text-2xl font-extrabold text-[#0A2E5C] tabular-nums mt-0.5">
              {stats.total}
            </div>
          </div>
          <FileCheck2 className="w-8 h-8 text-[#0A2E5C]" />
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Documentação Completa
            </span>
            <div className="font-display text-2xl font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {stats.complete}
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Com Pendência
            </span>
            <div className="font-display text-2xl font-extrabold text-amber-600 tabular-nums mt-0.5">
              {stats.pending}
            </div>
          </div>
          <XCircle className="w-8 h-8 text-amber-500" />
        </div>
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
              placeholder="Buscar placa, modelo ou setor..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0A2E5C] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['Todos', 'Anexado', 'Pendente'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-[#0A2E5C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-[#0A2E5C] text-white flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">
            Matriz de Evidências Anexadas ({filtered.length} veículos)
          </h2>
          <span className="text-xs text-blue-100">
            Clique nos ícones para alternar ou envie um arquivo PDF/imagem
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">Veículo</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3 text-center">CRLV</th>
                <th className="py-2.5 px-3 text-center">CNT</th>
                <th className="py-2.5 px-3 text-center">ANTT</th>
                <th className="py-2.5 px-3">Última Atualização</th>
                <th className="py-2.5 px-3 text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Nenhuma evidência cadastrada.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const allOk = ev.crlv && ev.cnt && ev.antt;
                  return (
                    <tr key={ev.vehicleId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono-tabular font-bold text-[#0A2E5C] whitespace-nowrap">
                        {ev.plate}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                        {ev.model}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {ev.sector}
                      </td>

                      {(['crlv', 'cnt', 'antt'] as const).map((field) => {
                        const active = ev[field];
                        const fileLabel =
                          field === 'crlv'
                            ? ev.crlvFile
                            : field === 'cnt'
                              ? ev.cntFile
                              : ev.anttFile;
                        return (
                          <td key={field} className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onToggleEvidenceField(ev.vehicleId, field)}
                                title={fileLabel ? `Anexo: ${fileLabel}` : 'Alternar status'}
                                className="p-1 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                {active ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerFileUpload(ev.vehicleId, field)}
                                title={`Enviar arquivo ${field.toUpperCase()}`}
                                className="p-1 rounded text-slate-400 hover:text-[#0A2E5C] hover:bg-slate-100 cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 font-mono-tabular text-slate-500 whitespace-nowrap">
                        {ev.updatedAt}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <EvidenceStatusBadge status={allOk ? 'Anexado' : 'Pendente'} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
