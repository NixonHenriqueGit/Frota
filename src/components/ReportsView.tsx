import React, { useMemo } from 'react';
import { Download, Printer, RotateCcw } from 'lucide-react';
import {
  Driver,
  Sector,
  Vehicle,
  VehicleDocumentRecord,
  VehicleEvidenceRecord,
} from '../types/fleet';
import { getChecklistItemsForCategory } from '../data/fleetSeed';
import {
  downloadCSV,
  formatCurrencyBRL,
  formatNumberBR,
} from '../utils/formatters';

interface ReportsViewProps {
  vehicles: Vehicle[];
  documents: VehicleDocumentRecord[];
  evidences: VehicleEvidenceRecord[];
  drivers: Driver[];
  onClearAllData: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  vehicles,
  documents,
  evidences,
  drivers,
  onClearAllData,
}) => {
  const summary = useMemo(() => {
    const totalFipe = vehicles.reduce((acc, v) => acc + v.fipeValue, 0);
    const totalCurrent = vehicles.reduce((acc, v) => acc + v.currentValue, 0);
    const ownCount = vehicles.filter((v) => v.ownership === 'Próprio').length;
    const thirdCount = vehicles.filter((v) => v.ownership === 'Terceiro').length;

    const regularDocs = documents.filter((d) => d.status === 'Regular').length;
    const docRate =
      documents.length > 0 ? Math.round((regularDocs / documents.length) * 100) : 0;

    const attachedEv = evidences.filter((e) => e.crlv && e.cnt && e.antt).length;
    const evRate =
      evidences.length > 0 ? Math.round((attachedEv / evidences.length) * 100) : 0;

    let passedChecks = 0;
    let totalChecks = 0;
    vehicles.forEach((v) => {
      getChecklistItemsForCategory(v.category).forEach((item) => {
        totalChecks += 1;
        if (v.checklist[item.key]) passedChecks += 1;
      });
    });
    const checklistRate =
      totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    return {
      totalFipe,
      totalCurrent,
      ownCount,
      thirdCount,
      docRate,
      evRate,
      checklistRate,
    };
  }, [vehicles, documents, evidences]);

  const bySector = useMemo(() => {
    const sectors: Sector[] = ['Distribuição', 'Vendas', 'Puxada', 'Armazém', 'Marketing'];
    return sectors.map((sector) => {
      const group = vehicles.filter((v) => v.sector === sector);
      const active = group.filter((v) => v.status === 'Ativo').length;
      const stopped = group.filter((v) => v.status === 'Parado').length;
      const fipe = group.reduce((acc, v) => acc + v.fipeValue, 0);
      return {
        sector,
        total: group.length,
        active,
        stopped,
        fipe,
      };
    });
  }, [vehicles]);

  const exportFullReport = () => {
    downloadCSV(
      'relatorio_gerencial_frota_pau_brasil.csv',
      ['Setor', 'Total Veículos', 'Ativos', 'Parados', 'Valor FIPE Total (R$)'],
      bySector.map((row) => [row.sector, row.total, row.active, row.stopped, row.fipe])
    );
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-4 no-print">
        <div>
          <h2 className="font-display text-sm font-bold text-[#0A2E5C]">
            Relatório Consolidado — Frota Pau Brasil – Brejo
          </h2>
          <p className="text-xs text-slate-500">
            Resumo patrimonial, conformidade documental e disponibilidade operacional
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClearAllData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zerar Dados</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>
          <button
            type="button"
            onClick={exportFullReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Valuation & Compliance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Patrimônio FIPE</div>
          <div className="font-display text-xl font-extrabold text-[#0A2E5C] font-mono-tabular mt-1">
            {formatCurrencyBRL(summary.totalFipe)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Valor atual estimado: {formatCurrencyBRL(summary.totalCurrent)}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">
            Conformidade Documental
          </div>
          <div className="font-display text-xl font-extrabold text-emerald-700 font-mono-tabular mt-1">
            {summary.docRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {documents.length} certidões monitoradas
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Evidências Completas</div>
          <div className="font-display text-xl font-extrabold text-[#0B63CE] font-mono-tabular mt-1">
            {summary.evRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            CRLV + CNT + ANTT anexados
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">
            Checklists Aprovados
          </div>
          <div className="font-display text-xl font-extrabold text-slate-900 font-mono-tabular mt-1">
            {summary.checklistRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {drivers.length} condutores ativos · {summary.ownCount} próprios / {summary.thirdCount} terceiros
          </div>
        </div>
      </div>

      {/* Sector Breakdown Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-[#0A2E5C] text-white">
          <h3 className="font-display text-sm font-bold">
            Distribuição Patrimonial e Operacional por Setor
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Setor</th>
                <th className="py-2.5 px-4 text-right">Total de Veículos</th>
                <th className="py-2.5 px-4 text-right">Ativos</th>
                <th className="py-2.5 px-4 text-right">Parados</th>
                <th className="py-2.5 px-4 text-right">Disponibilidade</th>
                <th className="py-2.5 px-4 text-right">Valor FIPE Consolidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bySector.map((row) => {
                const avail =
                  row.total > 0 ? Math.round((row.active / row.total) * 100) : 0;
                return (
                  <tr key={row.sector} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {row.sector}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-800">
                      {formatNumberBR(row.total)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular text-emerald-700 font-semibold">
                      {formatNumberBR(row.active)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular text-amber-700 font-semibold">
                      {formatNumberBR(row.stopped)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-700">
                      {avail}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-[#0A2E5C]">
                      {formatCurrencyBRL(row.fipe)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
