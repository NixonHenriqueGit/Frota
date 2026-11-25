import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Layers, Search, X } from 'lucide-react';
import { NavSection } from '../types/fleet';

interface Bloco1HubViewProps {
  onSelectSection: (section: NavSection) => void;
  legalizedCount: number;
  vehiclesCount: number;
  sanitaryCount: number;
  complianceCount: number;
  equipmentCount: number;
  activeGroup: '1.1' | '1.2' | null;
  onSelectGroup: (group: '1.1' | '1.2' | null) => void;
}

interface ModuleCardConfig {
  id: NavSection;
  group: '1.1' | '1.2';
  kicker: string;
  title: string;
  subtitle: string;
  countLabel: string;
}

const GROUP_1_1_TITLE = '1.1 DOCUMENTOS E AUTORIZAÇÕES';
const GROUP_1_1_SUBTITLE =
  'Documentos legalizados, controle de frota, processo DPO, laudos sanitários e conformidade mensal';

const GROUP_1_2_TITLE = '1.2 PADRÕES DE FROTA';
const GROUP_1_2_SUBTITLE =
  'Padrões de equipamentos de manuseio, transporte e diretrizes técnicas da frota';

export const Bloco1HubView: React.FC<Bloco1HubViewProps> = ({
  onSelectSection,
  legalizedCount,
  vehiclesCount,
  sanitaryCount,
  complianceCount,
  equipmentCount,
  activeGroup,
  onSelectGroup,
}) => {
  const [search, setSearch] = useState('');

  const modules11: ModuleCardConfig[] = useMemo(
    () => [
      {
        id: 'documentos-legalizados',
        group: '1.1',
        kicker: '1.1.1 · PASTAS OFICIAIS',
        title: '1.1.1 DOCUMENTOS LEGALIZADOS',
        subtitle:
          'ANTT, Contrato de Locação Veicular, CRLV (Entrega, Frota Leve e Puxada) e Cronotacógrafos',
        countLabel: `${String(legalizedCount).padStart(2, '0')} arq.`,
      },
      {
        id: 'visao-geral',
        group: '1.1',
        kicker: '1.1.2 · GESTÃO DE FROTA',
        title: '1.1.2 CONTROLE DE DOCUMENTOS',
        subtitle:
          'Visão geral, cadastro de frota, vencimentos de certidões, evidências e checklists',
        countLabel: `${String(vehiclesCount).padStart(2, '0')} veíc.`,
      },
      {
        id: 'processo-garantia',
        group: '1.1',
        kicker: '1.1.3 · PADRÃO DPO AMBEV',
        title: '1.1.3 PROCESSO PARA GARANTIR DOCUMENTAÇÃO',
        subtitle:
          'Anexo 1 RACI de Controle de Documentos, Controle de Chaves e Padrão Pilar Frota',
        countLabel: '03 docs.',
      },
      {
        id: 'laudo-vigilancia',
        group: '1.1',
        kicker: '1.1.4 · VIGILÂNCIA SANITÁRIA',
        title: '1.1.4 LAUDO DE VIGILÂNCIA SANITÁRIA',
        subtitle:
          'Laudo técnico da Vigilância Sanitária, alvarás sanitários e certidões oficiais',
        countLabel: `${String(sanitaryCount).padStart(2, '0')} ${sanitaryCount === 1 ? 'laudo' : 'laudos'}`,
      },
      {
        id: 'check-conformidade',
        group: '1.1',
        kicker: '1.1.5 · CONFORMIDADE MENSAL',
        title: '1.1.5 CHECK DOCUMENTAÇÃO FORA DE CONFORMIDADE',
        subtitle:
          'Acompanhamento mensal por placa de CRLV do Ano, Cronotacógrafo, ANTT e Contrato de Locação',
        countLabel: `${String(complianceCount).padStart(2, '0')} checks`,
      },
    ],
    [legalizedCount, vehiclesCount, sanitaryCount, complianceCount]
  );

  const modules12: ModuleCardConfig[] = useMemo(
    () => [
      {
        id: 'padroes-equipamentos',
        group: '1.2',
        kicker: '1.2.1 · PADRÕES TÉCNICOS',
        title: '1.2.1 PADRÕES DE EQUIPAMENTOS',
        subtitle:
          'Padrão de Equipamentos de Manuseio e documentos técnicos da frota (Word / PDF)',
        countLabel: `${String(equipmentCount).padStart(2, '0')} arq.`,
      },
    ],
    [equipmentCount]
  );

  const allModules = useMemo(() => [...modules11, ...modules12], [modules11, modules12]);

  const query = search.trim().toLowerCase();

  const currentGroupModules =
    activeGroup === '1.1'
      ? modules11
      : activeGroup === '1.2'
        ? modules12
        : allModules;

  const filteredModules = useMemo(() => {
    if (!query) return currentGroupModules;
    if (activeGroup === '1.1' && GROUP_1_1_TITLE.toLowerCase().includes(query)) return modules11;
    if (activeGroup === '1.2' && GROUP_1_2_TITLE.toLowerCase().includes(query)) return modules12;
    return currentGroupModules.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.kicker.toLowerCase().includes(query) ||
        m.subtitle.toLowerCase().includes(query)
    );
  }, [currentGroupModules, activeGroup, modules11, modules12, query]);

  const rootGroupCards = useMemo(
    () => [
      {
        id: '1.1' as const,
        kicker: '1.1 · BLOCO 1',
        title: GROUP_1_1_TITLE,
        subtitle: GROUP_1_1_SUBTITLE,
        countLabel: `${String(modules11.length).padStart(2, '0')} móds.`,
        statusLabel: 'Módulo ativo',
      },
      {
        id: '1.2' as const,
        kicker: '1.2 · BLOCO 1',
        title: GROUP_1_2_TITLE,
        subtitle: GROUP_1_2_SUBTITLE,
        countLabel: `${String(modules12.length).padStart(2, '0')} mód.`,
        statusLabel: 'Módulo ativo',
      },
    ],
    [modules11.length, modules12.length]
  );

  const matchingRootGroups = useMemo(() => {
    if (!query) return rootGroupCards;
    return rootGroupCards.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        g.kicker.toLowerCase().includes(query) ||
        g.subtitle.toLowerCase().includes(query)
    );
  }, [rootGroupCards, query]);

  const showRootGroups =
    activeGroup === null &&
    (query.length === 0 || (matchingRootGroups.length > 0 && filteredModules.length === 0));

  const heroTitle =
    activeGroup === '1.1'
      ? GROUP_1_1_TITLE
      : activeGroup === '1.2'
        ? GROUP_1_2_TITLE
        : 'BLOCO 1 — DOCUMENTOS DA FROTA';

  const heroSubtitle =
    activeGroup === '1.1'
      ? 'Selecione um módulo abaixo para acessar os documentos, controles e processos da frota.'
      : activeGroup === '1.2'
        ? 'Selecione um módulo abaixo para acessar os padrões técnicos e equipamentos da frota.'
        : 'Selecione uma categoria abaixo para abrir os módulos do Bloco 1.';

  const heroPlaceholder =
    activeGroup === '1.1'
      ? 'Filtrar em 1.1...'
      : activeGroup === '1.2'
        ? 'Filtrar em 1.2...'
        : 'Filtrar no Bloco 1...';

  return (
    <div className="flex-1 flex flex-col gap-4 py-1">
      {/* Category Index Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#001A6F] via-[#06295A] to-[#0B3C7D] px-5 py-4 sm:px-6 sm:py-5 shadow-[0_10px_26px_rgba(6,41,90,0.18)] border border-[#1B4A94]/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#38BDF8]/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#93C5FD]" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tracking-wide text-[#93C5FD]">
                {activeGroup !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectGroup(null);
                        setSearch('');
                      }}
                      className="inline-flex items-center gap-1 text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar ao Bloco 1</span>
                    </button>
                    <span aria-hidden="true" className="text-white/35">
                      ·
                    </span>
                    <span className="font-mono-tabular text-blue-100/90">
                      {currentGroupModules.length}{' '}
                      {currentGroupModules.length === 1
                        ? 'módulo disponível'
                        : 'módulos disponíveis'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Índice da Categoria</span>
                    <span aria-hidden="true" className="text-white/35">
                      ·
                    </span>
                    <span className="font-mono-tabular text-blue-100/90">
                      02 grupos · {allModules.length} módulos
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-display text-lg sm:text-[1.42rem] font-extrabold text-white tracking-tight leading-tight mt-0.5">
                {heroTitle}
              </h2>

              <p className="text-xs sm:text-[0.82rem] text-blue-100/85 mt-0.5 leading-snug max-w-2xl">
                {heroSubtitle}
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-[19rem] shrink-0">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={heroPlaceholder}
              aria-label="Filtrar módulos no Bloco 1"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-white text-[0.84rem] font-medium text-[#06295A] placeholder:text-slate-400 border border-white/80 shadow-[0_4px_14px_rgba(0,12,48,0.18)] focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Root Group Cards: 1.1 & 1.2 */}
      {showRootGroups ? (
        <section aria-label="Categorias do Bloco 1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {matchingRootGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(group.id)}
                className="group relative flex flex-col justify-between min-h-[155px] sm:min-h-[168px] rounded-xl border border-[#0B3C7D] bg-gradient-to-br from-[#072B5E] via-[#0B3C7D] to-[#1565D8] p-3.5 text-left text-white shadow-[0_6px_14px_rgba(11,60,125,0.2)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(11,60,125,0.3)] active:scale-[0.995] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-blue-200/90 truncate">
                    {group.kicker}
                  </span>
                  <span className="font-mono-tabular text-[0.72rem] font-bold text-blue-100 whitespace-nowrap shrink-0">
                    {group.countLabel}
                  </span>
                </div>

                <div className="my-2.5">
                  <h3 className="font-display text-[0.88rem] font-extrabold leading-snug tracking-tight text-white">
                    {group.title}
                  </h3>
                  <p className="text-[0.72rem] leading-snug text-blue-100/85 mt-1.5 line-clamp-3">
                    {group.subtitle}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-medium text-blue-100/80">
                    {group.statusLabel}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[0.72rem] font-bold text-white whitespace-nowrap shrink-0">
                    <span>Abrir</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : filteredModules.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200/90 p-10 text-center shadow-[0_2px_10px_rgba(6,41,90,0.04)]">
          <p className="text-sm font-semibold text-[#06295A]">
            Nenhum módulo encontrado para &ldquo;{search}&rdquo;.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Tente buscar pelo código (1.1, 1.2, 1.1.1 a 1.1.5 ou 1.2.1) ou pelo nome do módulo.
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3C7D] text-white text-xs font-semibold hover:bg-[#1256BA] transition-colors cursor-pointer"
          >
            Limpar filtro
          </button>
        </div>
      ) : (
        <section aria-label={heroTitle}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {filteredModules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  onSelectGroup(mod.group);
                  onSelectSection(mod.id);
                }}
                className="group relative flex flex-col justify-between min-h-[155px] sm:min-h-[168px] rounded-xl border border-[#0B3C7D] bg-gradient-to-br from-[#072B5E] via-[#0B3C7D] to-[#1565D8] p-3.5 text-left text-white shadow-[0_6px_14px_rgba(11,60,125,0.2)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(11,60,125,0.3)] active:scale-[0.995] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-blue-200/90 truncate">
                    {mod.kicker}
                  </span>
                  <span className="font-mono-tabular text-[0.72rem] font-bold text-blue-100 whitespace-nowrap shrink-0">
                    {mod.countLabel}
                  </span>
                </div>

                <div className="my-2.5">
                  <h3 className="font-display text-[0.88rem] font-extrabold leading-snug tracking-tight text-white">
                    {mod.title}
                  </h3>
                  <p className="text-[0.72rem] leading-snug text-blue-100/85 mt-1.5 line-clamp-3">
                    {mod.subtitle}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-medium text-blue-100/80">
                    Módulo ativo
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[0.72rem] font-bold text-white whitespace-nowrap shrink-0">
                    <span>Abrir</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
