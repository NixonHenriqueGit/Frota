import React, { useMemo, useState } from 'react';
import {
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Search,
  XCircle,
} from 'lucide-react';
import { ChecklistKey, Vehicle } from '../types/fleet';
import { getChecklistItemsForCategory, normalizeAssetUrl } from '../data/fleetSeed';
import { VehicleStatusBadge } from './StatusBadges';

interface ChecklistsViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  onToggleChecklistItem: (vehicleId: string, key: ChecklistKey) => void;
  onMarkAllChecklist: (vehicleId: string, value: boolean) => void;
}

export const ChecklistsView: React.FC<ChecklistsViewProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  onToggleChecklistItem,
  onMarkAllChecklist,
}) => {
  const [search, setSearch] = useState('');

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.manufacturerModel.toLowerCase().includes(q) ||
        v.sector.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const activeVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];

  const fleetCompliance = useMemo(() => {
    let totalChecks = 0;
    let passedChecks = 0;
    for (const v of vehicles) {
      const items = getChecklistItemsForCategory(v.category);
      for (const item of items) {
        totalChecks += 1;
        if (v.checklist[item.key]) passedChecks += 1;
      }
    }
    return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  }, [vehicles]);

  const activeChecklistItems = useMemo(
    () => (activeVehicle ? getChecklistItemsForCategory(activeVehicle.category) : []),
    [activeVehicle]
  );

  const activeCheckedCount = activeVehicle
    ? activeChecklistItems.filter((item) => activeVehicle.checklist[item.key]).length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Vehicle Selector List */}
      <div className="lg:col-span-4 rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col max-h-[760px]">
        <div className="px-4 py-3 bg-[#0A2E5C] text-white flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">
            Frota — Inspeção ({fleetCompliance}% conforme)
          </h2>
        </div>

        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar placa ou modelo..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0A2E5C] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
          {filteredVehicles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhum veículo cadastrado.
            </div>
          ) : (
            filteredVehicles.map((v) => {
              const items = getChecklistItemsForCategory(v.category);
              const passed = items.filter((i) => v.checklist[i.key]).length;
              const total = items.length;
              const isSelected = activeVehicle?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVehicle(v.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-[#0A2E5C]">
                        {v.plate}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {v.category} · {v.sector}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 truncate mt-0.5">
                      {v.manufacturerModel}
                    </div>
                  </div>

                  <span
                    className={`font-mono-tabular text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                      passed === total
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {passed}/{total}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Active Vehicle Checklist */}
      {activeVehicle ? (
        <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-[#0A2E5C] text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="w-5 h-5 text-blue-200" />
              <div>
                <h2 className="font-display text-sm font-bold">
                  Checklist de Inspeção — {activeVehicle.plate}
                </h2>
                <p className="text-xs text-blue-200">
                  {activeVehicle.manufacturerModel} · {activeVehicle.category} ·{' '}
                  {activeVehicle.sector}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onMarkAllChecklist(activeVehicle.id, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Aprovar Todos</span>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Vehicle Mini Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img
                  src={normalizeAssetUrl(activeVehicle.photoUrl)}
                  alt={activeVehicle.manufacturerModel}
                  referrerPolicy="no-referrer"
                  className="w-24 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {activeVehicle.manufacturerModel}
                    </span>
                    <VehicleStatusBadge status={activeVehicle.status} />
                  </div>
                  <div className="text-slate-500">
                    Renavam: <span className="font-mono-tabular">{activeVehicle.renavam}</span> ·
                    CRLV: <span className="font-mono-tabular">{activeVehicle.expiryDates.crlv}</span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs text-slate-500">
                  Itens Conforme ({activeVehicle.category})
                </div>
                <div className="font-display text-2xl font-extrabold text-[#0A2E5C] tabular-nums">
                  {activeCheckedCount} / {activeChecklistItems.length}
                </div>
              </div>
            </div>

            {/* Category-Specific Checklist Items Grid */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Checklist específico para <strong className="text-slate-800">{activeVehicle.category}</strong>
              </span>
              <span className="font-mono-tabular">{activeChecklistItems.length} itens</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeChecklistItems.map((item) => {
                const checked = activeVehicle.checklist[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleChecklistItem(activeVehicle.id, item.key)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer ${
                      checked
                        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                        : 'border-red-200 bg-red-50/50 hover:bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {checked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        checked ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {checked ? 'Conforme' : 'Pendente'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 gap-2">
          <ClipboardCheck className="w-8 h-8 text-slate-300" />
          <p>Cadastre um veículo para realizar o checklist de inspeção.</p>
        </div>
      )}
    </div>
  );
};
