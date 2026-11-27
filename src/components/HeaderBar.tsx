import React from 'react';
import {
  ArrowLeft,
  Camera,
  ClipboardCheck,
  FileText,
  Home,
  Menu,
  Truck,
} from 'lucide-react';
import { NavSection } from '../types/fleet';

interface HeaderBarProps {
  activeSection: NavSection;
  lastUpdated: string;
  onSelectSection: (section: NavSection) => void;
  onToggleMenu: () => void;
}

const SECTION_HEADERS: Record<NavSection, { context: string; subtitle: string }> = {
  'bloco-1': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle: 'Central de módulos do Bloco 1: documentos legalizados, controle da frota, DPO e laudos',
  },
  'documentos-legalizados': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Pastas oficiais da frota: ANTT, Contrato de Locação Veicular, CRLV e Cronotacógrafos',
  },
  'processo-garantia': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Padrão DPO Ambev: Processos e diretrizes para garantir a conformidade documental da frota',
  },
  'laudo-vigilancia': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Laudo técnico, alvará sanitário e certidões oficiais da Vigilância Sanitária',
  },
  'check-conformidade': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Acompanhamento mensal de documentos obrigatórios por placa (CRLV, Cronotacógrafo, ANTT e Contrato de Locação)',
  },
  'padroes-equipamentos': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Padrões de equipamentos de manuseio, transporte e documentos técnicos oficiais da frota',
  },
  'padroes-visuais': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Inspeção visual e validação por placa ou equipamento (Frota e Equipamentos de Armazém)',
  },
  'lista-requisitos': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      'Lista de Requisitos - Qualidade e Segurança: Check de Segurança mensal por operação e placa',
  },
  'melhoria-progressiva': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      '1.3.2 Melhoria Progressiva: DPO Pilar Frota - Padrão Gestão de Checklists e documentos técnicos',
  },
  'estratificacao-problemas': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      '1.3.3.4 Estratificação dos Problemas: análise digital por veículo/equipamento, tipo de ocorrência, motorista/operador e criticidade',
  },
  'qualidade-iv': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle:
      '1.3.7 Qualidade (IV): Indicador de Valor para medir a qualidade dos checklists realizados na plataforma',
  },
  'visao-geral': {
    context: 'Frota Pau Brasil – Brejo',
    subtitle: 'Acompanhe em tempo real o desempenho e a documentação da frota',
  },
  cadastro: {
    context: 'Cadastro de Frota',
    subtitle: 'Gerencie os veículos, especificações técnicas e importação em lote',
  },
  documentos: {
    context: 'Vencimentos e Certidões',
    subtitle: 'Monitore vencimentos de CRLV, IPVA, ANTT, Cronotacógrafo e Extintores',
  },
  evidencias: {
    context: 'Evidências Anexadas',
    subtitle: 'Valide comprovantes digitais e situação documental de cada veículo',
  },
  checklists: {
    context: 'Checklists de Inspeção',
    subtitle: 'Acompanhe os 15 itens de segurança e conformidade por veículo',
  },
};

const SUB_TABS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Home },
  { id: 'cadastro', label: 'Cadastro de Frota', icon: Truck },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'evidencias', label: 'Evidências', icon: Camera },
  { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeSection,
  onSelectSection,
  onToggleMenu,
}) => {
  const { context, subtitle } = SECTION_HEADERS[activeSection];
  const isInsideSubmodule = activeSection !== 'bloco-1';

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-white via-white to-[#F7FAFE] border-b border-slate-200/90 shadow-[0_2px_12px_rgba(6,41,90,0.05)] px-4 sm:px-5 pt-2.5 pb-2 no-print">
      {/* Top Row: Module Title & Primary Action */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Abrir menu lateral"
            className="md:hidden p-2 -ml-1 rounded-lg text-[#06295A] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565D8]/50 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {isInsideSubmodule && (
            <button
              type="button"
              onClick={() => onSelectSection('bloco-1')}
              title="Voltar aos módulos do Bloco 1"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] rounded-xl bg-[#EEF4FC] hover:bg-[#DFEBFB] border border-[#CFE0F5] text-[#0B3C7D] text-xs font-bold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565D8]/50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Bloco 1</span>
            </button>
          )}

          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-[1.22rem] font-bold text-[#06295A] tracking-[0.01em] [word-spacing:0.1em] leading-tight truncate">
              <span className="text-[#1256BA]">
                {activeSection === 'bloco-1'
                  ? 'BLOCO 1 · Documentos da Frota'
                  : activeSection === 'documentos-legalizados'
                    ? '1.1.1 Documentos Legalizados'
                    : activeSection === 'processo-garantia'
                      ? '1.1.3 Processo para Garantir Documentação'
                      : activeSection === 'laudo-vigilancia'
                        ? '1.1.4 Laudo de Vigilância Sanitária'
                        : activeSection === 'check-conformidade'
                          ? '1.1.5 Check Documentação Fora de Conformidade'
                          : activeSection === 'padroes-equipamentos'
                            ? '1.2.1 Padrões de Equipamentos'
                            : activeSection === 'padroes-visuais'
                              ? '1.2.2 Padrões Visuais'
                              : activeSection === 'lista-requisitos'
                                ? '1.2.3 Lista de Requisitos - Qualidade e Segurança'
                                : activeSection === 'melhoria-progressiva'
                                  ? '1.3.2 Melhoria Progressiva'
                                  : activeSection === 'estratificacao-problemas'
                                    ? '1.3.3.4 Estratificação dos Problemas'
                                    : activeSection === 'qualidade-iv'
                                      ? '1.3.7 Qualidade (IV)'
                                      : '1.1.2 Controle de Documentos'}
              </span>
              <span className="mx-2 text-slate-300 font-normal" aria-hidden="true">
                |
              </span>
              <span>{context}</span>
            </h1>
            <p className="text-[0.77rem] text-slate-500 mt-0.5 truncate leading-tight">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-navigation Menu Rail (1.1.2 Controle de Documentos) */}
      {activeSection !== 'bloco-1' &&
        activeSection !== 'documentos-legalizados' &&
        activeSection !== 'processo-garantia' &&
        activeSection !== 'laudo-vigilancia' &&
        activeSection !== 'check-conformidade' &&
        activeSection !== 'padroes-equipamentos' &&
        activeSection !== 'padroes-visuais' &&
        activeSection !== 'lista-requisitos' &&
        activeSection !== 'melhoria-progressiva' &&
        activeSection !== 'estratificacao-problemas' &&
        activeSection !== 'qualidade-iv' && (
        <div className="pt-1.5 border-t border-slate-200/70">
          <nav
            aria-label="Subseções de 1.1.2 Controle de Documentos"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EAF1FA] border border-[#D6E2F2] max-w-full overflow-x-auto"
          >
            {SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectSection(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] rounded-lg text-[0.82rem] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565D8]/50 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white font-semibold shadow-[0_2px_8px_rgba(11,60,125,0.28)]'
                      : 'text-slate-600 font-medium hover:text-[#06295A] hover:bg-white/90 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-colors duration-150 ${
                      isActive
                        ? 'text-blue-200'
                        : 'text-slate-400 group-hover:text-[#1565D8]'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
