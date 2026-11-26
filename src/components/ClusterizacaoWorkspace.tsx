import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Download,
  Info,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  CLUSTERIZACAO_BY_MODAL,
  CLUSTERIZACAO_MODALS,
  ClusterizacaoClassification,
  ClusterizacaoLevel,
  ClusterizacaoModalKey,
  ClusterizacaoRule,
} from '../data/clusterizacaoData';

interface ClusterizacaoWorkspaceProps {
  onBack: () => void;
}

const LEVEL_STYLES: Record<
  ClusterizacaoLevel,
  { badge: string; rowTint: string }
> = {
  'BLOQUEIO IMEDIATO': {
    badge: 'bg-red-50 text-red-700 border-red-300 font-extrabold',
    rowTint: 'hover:bg-red-50/40',
  },
  GRAVE: {
    badge: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    rowTint: 'hover:bg-amber-50/40',
  },
  MÉDIO: {
    badge: 'bg-sky-50 text-sky-800 border-sky-300 font-bold',
    rowTint: 'hover:bg-sky-50/40',
  },
  LEVE: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
    rowTint: 'hover:bg-emerald-50/40',
  },
};

export const ClusterizacaoWorkspace: React.FC<ClusterizacaoWorkspaceProps> = ({
  onBack,
}) => {
  const [activeModal, setActiveModal] =
    useState<ClusterizacaoModalKey>('caminhoes');
  const [search, setSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<
    'ALL' | ClusterizacaoClassification
  >('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | ClusterizacaoLevel>(
    'ALL'
  );

  const modalMeta = useMemo(
    () =>
      CLUSTERIZACAO_MODALS.find((m) => m.key === activeModal) ??
      CLUSTERIZACAO_MODALS[0],
    [activeModal]
  );

  const allRules = useMemo(
    () => CLUSTERIZACAO_BY_MODAL[activeModal],
    [activeModal]
  );

  const macroOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of allRules) {
      if (!seen.has(r.macro)) {
        seen.add(r.macro);
        list.push(r.macro);
      }
    }
    return list;
  }, [allRules]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRules.filter((rule) => {
      if (macroFilter !== 'ALL' && rule.macro !== macroFilter) return false;
      if (
        classificationFilter !== 'ALL' &&
        rule.classification !== classificationFilter
      ) {
        return false;
      }
      if (levelFilter !== 'ALL' && rule.level !== levelFilter) return false;
      if (!q) return true;
      return (
        rule.macro.toLowerCase().includes(q) ||
        rule.micro.toLowerCase().includes(q) ||
        rule.classification.toLowerCase().includes(q) ||
        rule.level.toLowerCase().includes(q) ||
        rule.explanation.toLowerCase().includes(q)
      );
    });
  }, [allRules, macroFilter, classificationFilter, levelFilter, search]);

  const levelCounts = useMemo(() => {
    const counts: Record<ClusterizacaoLevel, number> = {
      'BLOQUEIO IMEDIATO': 0,
      GRAVE: 0,
      MÉDIO: 0,
      LEVE: 0,
    };
    for (const r of filteredRules) {
      counts[r.level] += 1;
    }
    return counts;
  }, [filteredRules]);

  // Precompute vertical merge spans for Macro + Micro matching the Excel layout
  const tableRows = useMemo(() => {
    const macroStarts = new Map<number, number>();
    const microStarts = new Map<number, number>();

    let i = 0;
    while (i < filteredRules.length) {
      let j = i + 1;
      while (
        j < filteredRules.length &&
        filteredRules[j].macro === filteredRules[i].macro
      ) {
        j += 1;
      }
      macroStarts.set(i, j - i);
      i = j;
    }

    let k = 0;
    while (k < filteredRules.length) {
      let m = k + 1;
      while (
        m < filteredRules.length &&
        filteredRules[m].macro === filteredRules[k].macro &&
        filteredRules[m].micro === filteredRules[k].micro
      ) {
        m += 1;
      }
      microStarts.set(k, m - k);
      k = m;
    }

    return filteredRules.map((rule, idx) => ({
      rule,
      macroRowSpan: macroStarts.get(idx) ?? 0,
      microRowSpan: microStarts.get(idx) ?? 0,
      isGroupStart: idx === 0 || filteredRules[idx - 1].macro !== rule.macro,
      isMicroStart:
        idx === 0 ||
        filteredRules[idx - 1].macro !== rule.macro ||
        filteredRules[idx - 1].micro !== rule.micro,
    }));
  }, [filteredRules]);

  const handleSelectModal = (key: ClusterizacaoModalKey) => {
    setActiveModal(key);
    setMacroFilter('ALL');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    for (const meta of CLUSTERIZACAO_MODALS) {
      const rows = CLUSTERIZACAO_BY_MODAL[meta.key].map((r: ClusterizacaoRule) =>
        meta.showMacroColumn
          ? {
              'Item de Verificação - Macro': r.macro,
              'Item de Verificação - Micro': r.micro,
              Classificação: r.classification,
              Clusterização: r.level,
              'Explicação da Clusterização': r.explanation,
            }
          : {
              'Grupo / Área': r.macro,
              'Item de Verificação - Micro': r.micro,
              Classificação: r.classification,
              Clusterização: r.level,
              'Explicação da Clusterização': r.explanation,
            }
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 },
        { wch: 36 },
        { wch: 14 },
        { wch: 20 },
        { wch: 76 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, meta.shortLabel);
    }
    XLSX.writeFile(wb, '1.2.3_Clusterizacao_Frota.xlsx');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    macroFilter !== 'ALL' ||
    classificationFilter !== 'ALL' ||
    levelFilter !== 'ALL';

  return (
    <section className="flex-1 flex flex-col rounded-xl bg-white border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Top Navy Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-bold text-white cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-[1rem] font-extrabold tracking-wide text-white uppercase truncate">
                CLUSTERIZAÇÃO — CRITÉRIOS OFICIAIS
              </h2>
              <span className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 rounded bg-white/15 border border-white/25 text-blue-100 shrink-0">
                {allRules.length} critérios · {modalMeta.shortLabel}
              </span>
            </div>
            <p className="text-[0.74rem] text-blue-100/85 mt-0.5 truncate">
              Classificação (Segurança / Qualidade), gravidade e explicação para Caminhões, Puxada e Empilhadeira.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#06295A] text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* Modal Switcher + Summary Strip */}
      <div className="px-4 py-2.5 bg-[#F4F8FD] border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-1.5 flex-wrap"
          role="tablist"
          aria-label="Modais de Clusterização"
        >
          {CLUSTERIZACAO_MODALS.map((meta) => {
            const active = activeModal === meta.key;
            const ruleCount = CLUSTERIZACAO_BY_MODAL[meta.key].length;
            return (
              <button
                key={meta.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectModal(meta.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0B3C7D] text-white shadow-[0_2px_6px_rgba(11,60,125,0.28)]'
                    : 'bg-white border border-slate-200/90 text-slate-600 hover:text-[#06295A] hover:border-[#1565D8]/40'
                }`}
              >
                {meta.label} ({ruleCount})
              </button>
            );
          })}
        </div>

        {/* Severity Quick Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() =>
              setLevelFilter((curr) =>
                curr === 'BLOQUEIO IMEDIATO' ? 'ALL' : 'BLOQUEIO IMEDIATO'
              )
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-bold cursor-pointer transition-colors ${
              levelFilter === 'BLOQUEIO IMEDIATO'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            <span>Bloqueio ({levelCounts['BLOQUEIO IMEDIATO']})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setLevelFilter((curr) => (curr === 'GRAVE' ? 'ALL' : 'GRAVE'))
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-bold cursor-pointer transition-colors ${
              levelFilter === 'GRAVE'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Grave ({levelCounts.GRAVE})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setLevelFilter((curr) => (curr === 'MÉDIO' ? 'ALL' : 'MÉDIO'))
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-bold cursor-pointer transition-colors ${
              levelFilter === 'MÉDIO'
                ? 'bg-sky-600 text-white border-sky-700'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100/80'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Médio ({levelCounts.MÉDIO})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setLevelFilter((curr) => (curr === 'LEVE' ? 'ALL' : 'LEVE'))
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-bold cursor-pointer transition-colors ${
              levelFilter === 'LEVE'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
            }`}
          >
            <Info className="w-3 h-3" />
            <span>Leve ({levelCounts.LEVE})</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[210px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item micro, macro ou explicação..."
            className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-50/70 border border-slate-200 text-xs font-medium text-[#06295A] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40"
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

        <select
          value={macroFilter}
          onChange={(e) => setMacroFilter(e.target.value)}
          aria-label="Filtrar por grupo macro"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40 cursor-pointer"
        >
          <option value="ALL">
            {modalMeta.showMacroColumn ? 'Todos os Macros' : 'Todos os Grupos'}
          </option>
          {macroOptions.map((macro) => (
            <option key={macro} value={macro}>
              {macro}
            </option>
          ))}
        </select>

        <select
          value={classificationFilter}
          onChange={(e) =>
            setClassificationFilter(
              e.target.value as 'ALL' | ClusterizacaoClassification
            )
          }
          aria-label="Filtrar por classificação"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40 cursor-pointer"
        >
          <option value="ALL">Classificação: Todas</option>
          <option value="SEGURANÇA">SEGURANÇA</option>
          <option value="QUALIDADE">QUALIDADE</option>
        </select>

        <select
          value={levelFilter}
          onChange={(e) =>
            setLevelFilter(e.target.value as 'ALL' | ClusterizacaoLevel)
          }
          aria-label="Filtrar por nível de clusterização"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-[#06295A] focus:outline-none focus:ring-2 focus:ring-[#1565D8]/40 cursor-pointer"
        >
          <option value="ALL">Clusterização: Todas</option>
          <option value="BLOQUEIO IMEDIATO">BLOQUEIO IMEDIATO</option>
          <option value="GRAVE">GRAVE</option>
          <option value="MÉDIO">MÉDIO</option>
          <option value="LEVE">LEVE</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setMacroFilter('ALL');
              setClassificationFilter('ALL');
              setLevelFilter('ALL');
            }}
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Limpar filtros
          </button>
        )}

        <span className="ml-auto font-mono-tabular text-[11px] font-bold text-slate-500 whitespace-nowrap">
          {filteredRules.length} de {allRules.length} linha(s)
        </span>
      </div>

      {/* Criteria Matrix Table */}
      <div className="flex-1 overflow-auto p-3.5 bg-[#F4F7FB]">
        {tableRows.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-[#06295A]">
              Nenhum critério encontrado para os filtros aplicados.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ajuste a busca ou limpe os filtros acima para visualizar toda a matriz de {modalMeta.shortLabel}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-[0_1px_5px_rgba(6,41,90,0.06)]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#DCE8F8] text-[#06295A] font-extrabold text-[11.5px] border-b-2 border-slate-400">
                  {modalMeta.showMacroColumn && (
                    <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap w-[150px]">
                      Item de Verificação - Macro
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-[210px]">
                    Item de Verificação - Micro
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap w-[125px]">
                    Classificação
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap w-[170px]">
                    Clusterização
                  </th>
                  <th className="py-2.5 px-3.5 text-left min-w-[360px]">
                    Explicação da Clusterização
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableRows.map(
                  ({
                    rule,
                    macroRowSpan,
                    microRowSpan,
                    isGroupStart,
                    isMicroStart,
                  }) => {
                    const levelStyle = LEVEL_STYLES[rule.level];
                    return (
                      <tr
                        key={rule.id}
                        className={`transition-colors ${levelStyle.rowTint} ${
                          isGroupStart
                            ? 'border-t-2 border-slate-400'
                            : isMicroStart
                              ? 'border-t border-slate-300'
                              : 'border-t border-dashed border-slate-200'
                        }`}
                      >
                        {modalMeta.showMacroColumn && macroRowSpan > 0 && (
                          <td
                            rowSpan={macroRowSpan}
                            className="py-3 px-3 text-center align-middle bg-[#E9F0FA] font-display text-base font-extrabold italic text-[#06295A] border-r-2 border-slate-400"
                          >
                            {rule.macro}
                          </td>
                        )}

                        {microRowSpan > 0 && (
                          <td
                            rowSpan={microRowSpan}
                            className="py-2 px-3 text-center align-middle font-bold text-[#06295A] bg-slate-50/60 border-r border-slate-300"
                          >
                            {rule.micro}
                          </td>
                        )}

                        <td className="py-1.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide ${
                              rule.classification === 'SEGURANÇA'
                                ? 'bg-[#EEF4FC] text-[#0B3C7D]'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rule.classification}
                          </span>
                        </td>

                        <td className="py-1.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded border text-[10.5px] tracking-wide ${levelStyle.badge}`}
                          >
                            {rule.level}
                          </span>
                        </td>

                        <td className="py-1.5 px-3.5 text-left text-slate-800 leading-snug">
                          {rule.explanation}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
