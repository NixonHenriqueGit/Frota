import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Users, X } from 'lucide-react';
import { Driver, Sector, Vehicle } from '../types/fleet';

interface DriversViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onAddDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
}

const SECTORS: Sector[] = ['Distribuição', 'Vendas', 'Puxada', 'Armazém', 'Marketing'];
const CNH_CATS: Driver['cnhCategory'][] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AE'];

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  vehicles,
  onAddDriver,
  onDeleteDriver,
}) => {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<'Todos' | Sector>('Todos');
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [cnh, setCnh] = useState('');
  const [cnhCategory, setCnhCategory] = useState<Driver['cnhCategory']>('E');
  const [cnhExpiry, setCnhExpiry] = useState('15/12/2028');
  const [phone, setPhone] = useState('');
  const [sector, setSector] = useState<Sector>('Distribuição');
  const [platesInput, setPlatesInput] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (sectorFilter !== 'Todos' && d.sector !== sectorFilter) return false;
      if (q) {
        return (
          d.name.toLowerCase().includes(q) ||
          d.cnh.includes(q) ||
          d.assignedPlates.some((p) => p.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [drivers, search, sectorFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const assigned = platesInput
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    onAddDriver({
      id: `drv-${Date.now()}`,
      name: name.trim(),
      cnh: cnh.trim() || '00000000000',
      cnhCategory,
      cnhExpiry: cnhExpiry.trim() || '15/12/2028',
      phone: phone.trim() || '(98) 99000-0000',
      sector,
      assignedPlates: assigned.length > 0 ? assigned : [vehicles[0]?.plate ?? 'QXW-1234'],
      status: 'Ativo',
    });

    setName('');
    setCnh('');
    setPhone('');
    setPlatesInput('');
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar condutor, CNH ou placa..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0A2E5C] focus:outline-none"
            />
          </div>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value as 'Todos' | Sector)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#0A2E5C] focus:outline-none"
          >
            <option value="Todos">Todos Setores</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Condutor</span>
        </button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-[#0A2E5C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-200" />
            <h2 className="font-display text-sm font-bold">
              Condutores Habilitados ({filtered.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Nome do Condutor</th>
                <th className="py-2.5 px-3">CNH</th>
                <th className="py-2.5 px-3 text-center">Cat.</th>
                <th className="py-2.5 px-3">Validade CNH</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3">Placas Associadas</th>
                <th className="py-2.5 px-3">Situação</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Nenhum condutor cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map((drv) => (
                  <tr key={drv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {drv.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {drv.cnh}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-[#0A2E5C]">
                      {drv.cnhCategory}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {drv.cnhExpiry}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {drv.phone}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {drv.sector}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular font-semibold text-[#0B63CE]">
                      {drv.assignedPlates.join(', ')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          drv.status === 'Ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {drv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteDriver(drv.id)}
                        title="Remover condutor"
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Driver Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2E5C] text-white">
              <h3 className="font-display text-sm font-bold">Cadastrar Condutor</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pedro Henrique"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº Registro CNH
                  </label>
                  <input
                    type="text"
                    value={cnh}
                    onChange={(e) => setCnh(e.target.value)}
                    placeholder="04918273645"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={cnhCategory}
                    onChange={(e) =>
                      setCnhCategory(e.target.value as Driver['cnhCategory'])
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {CNH_CATS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validade CNH
                  </label>
                  <input
                    type="text"
                    value={cnhExpiry}
                    onChange={(e) => setCnhExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Setor
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value as Sector)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(98) 99123-4567"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placas (vírgula)
                  </label>
                  <input
                    type="text"
                    value={platesInput}
                    onChange={(e) => setPlatesInput(e.target.value)}
                    placeholder="QXW-1234, RTE-5678"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0A2E5C] text-white text-xs font-semibold cursor-pointer"
                >
                  Salvar Condutor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
