import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Layers,
  Plus,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';

interface DpoProcessStep {
  id: string;
  code: string;
  title: string;
  owner: string;
  frequency: string;
  target: string;
  status: 'Conforme' | 'Em Andamento' | 'Revisão Pendente';
  description: string;
  deliverables: string[];
}

const DPO_PROCESS_STEPS: DpoProcessStep[] = [
  {
    id: 'dpo-1',
    code: '1.1.3.1',
    title: 'Mapeamento e Inventário de Frota & Documentos',
    owner: 'Gestão de Frota / Logística',
    frequency: 'Mensal',
    target: '100% dos veículos inventariados',
    status: 'Conforme',
    description:
      'Identificação e cadastro rigoroso de todos os ativos da frota (Caminhões, Carretas, Cavalos Mecânicos, Frota Leve e Empilhadeiras) vinculando CRLV, ANTT e Contratos no DPO Pillar Frota.',
    deliverables: [
      'Matriz de ativos atualizada',
      'Validação de placas e chassis',
      'Classificação por subpastas (Entrega, Frota Leve, Puxada)',
    ],
  },
  {
    id: 'dpo-2',
    code: '1.1.3.2',
    title: 'Monitoramento Preventivo de Vencimentos (30/60 dias)',
    owner: 'Compliance Documental',
    frequency: 'Semanal',
    target: '0% de documentos vencidos em operação',
    status: 'Conforme',
    description:
      'Acompanhamento contínuo dos prazos de validade de CRLV, IPVA, Aferições INMETRO (Cronotacígrafos) e RNTRC (ANTT) com emissão antecipada de alertas.',
    deliverables: [
      'Painel de alertas de vencimento',
      'Protocolos de renovação antecipada',
      'Checklist de regularização de multas',
    ],
  },
  {
    id: 'dpo-3',
    code: '1.1.3.3',
    title: 'Auditoria e Legalização de Terceiros e Agregados',
    owner: 'Jurídico / Suprimentos',
    frequency: 'Quinzenal',
    target: '100% contratos e seguros vigentes',
    status: 'Em Andamento',
    description:
      'Garantia de conformidade contratual, apólices de seguro de carga (RCF-DC/RCTRC) e conformidade ANTT para veículos locados e terceirizados.',
    deliverables: [
      'Contratos de locação veicular arquivados',
      'Comprovantes de seguro ativos',
      'Termos de vistoria de entrega',
    ],
  },
  {
    id: 'dpo-4',
    code: '1.1.3.4',
    title: 'Garantia da Qualidade Operacional DPO (Pilar Frota)',
    owner: 'Gerência Ambev / DPO Lead',
    frequency: 'Trimestral',
    target: 'Nota >= 95% na auditoria DPO Frota',
    status: 'Conforme',
    description:
      'Revisão de indicadores de performance, planos de ação corretiva e conformidade com os padrões de excelência operacional DPO (Distribution Process Optimization).',
    deliverables: [
      'Relatório executivo DPO Pillar Frota',
      'Plano de ação PDCA para não conformidades',
      'Certificado de conformidade documental',
    ],
  },
];

export const ProcessGuaranteeView: React.FC = () => {
  const [steps, setSteps] = useState<DpoProcessStep[]>(DPO_PROCESS_STEPS);
  const [selectedStep, setSelectedStep] = useState<DpoProcessStep>(DPO_PROCESS_STEPS[0]);
  const [newActionModal, setNewActionModal] = useState(false);
  const [actionTitle, setActionTitle] = useState('');
  const [actionOwner, setActionOwner] = useState('');

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Header Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            <span>DPO Ambev — Pilar Frota & Logística</span>
          </div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            1.1.3 Processo para Garantir Documentação
          </h2>
          <p className="text-xs text-blue-100/95 mt-1 max-w-2xl leading-relaxed">
            Diretrizes de excelência operacional, rotinas de conformidade e garantia de regularidade documental para toda a frota da distribuidora Pau Brasil.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-right backdrop-blur-sm">
            <div className="text-[0.68rem] font-semibold text-blue-200">Índice DPO Frota</div>
            <div className="font-mono-tabular text-lg font-extrabold text-white">98.4%</div>
          </div>
          <button
            type="button"
            onClick={() => setNewActionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#06295A] hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Diretriz DPO</span>
          </button>
        </div>
      </div>

      {/* Grid of 4 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {steps.map((step) => {
          const isSelected = selectedStep.id === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setSelectedStep(step)}
              className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-[#072B5E] via-[#0B3C7D] to-[#1565D8] border-[#0B3C7D] text-white shadow-lg'
                  : 'bg-white border-slate-200/90 text-[#06295A] hover:border-[#60A5FA] shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`font-mono-tabular text-xs font-bold px-2 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#1565D8]'
                    }`}
                  >
                    {step.code}
                  </span>
                  <span
                    className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${
                      step.status === 'Conforme'
                        ? isSelected
                          ? 'bg-emerald-400/20 text-emerald-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isSelected
                        ? 'bg-amber-400/20 text-amber-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>

                <h3
                  className={`font-display text-[0.88rem] font-bold leading-snug tracking-tight ${
                    isSelected ? 'text-white' : 'text-[#06295A]'
                  }`}
                >
                  {step.title}
                </h3>
              </div>

              <div
                className={`mt-3 pt-2.5 border-t text-[0.72rem] flex items-center justify-between ${
                  isSelected ? 'border-white/15 text-blue-100' : 'border-slate-100 text-slate-500'
                }`}
              >
                <span>{step.frequency}</span>
                <span className="font-semibold">{step.owner}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Step Detail Workspace */}
      <div className="rounded-xl bg-white border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#1565D8] flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-xs font-bold text-[#1565D8]">
                  {selectedStep.code}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">
                  Responsável: {selectedStep.owner}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#06295A] mt-0.5">
                {selectedStep.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[0.68rem] font-semibold text-slate-400">Meta DPO</div>
              <div className="text-xs font-bold text-[#06295A]">{selectedStep.target}</div>
            </div>
            <div className="text-right pl-3 border-l border-slate-200">
              <div className="text-[0.68rem] font-semibold text-slate-400">Frequência</div>
              <div className="text-xs font-bold text-[#06295A]">{selectedStep.frequency}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Diretriz Operacional DPO
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/70">
              {selectedStep.description}
            </p>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-1">
              Entregáveis Obrigatórios (Deliverables)
            </h4>
            <ul className="space-y-2">
              {selectedStep.deliverables.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#06295A] flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[#1565D8]" />
                <span>Status de Conformidade</span>
              </h4>
              <p className="text-[0.74rem] text-slate-600 leading-relaxed">
                Este processo faz parte do pilar de conformidade frota Ambev. Todos os registros são validados periodicamente em auditoria interna.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const nextStatus: DpoProcessStep['status'] =
                    selectedStep.status === 'Conforme' ? 'Em Andamento' : 'Conforme';
                  const updated = steps.map((s) =>
                    s.id === selectedStep.id ? { ...s, status: nextStatus } : s
                  );
                  setSteps(updated);
                  setSelectedStep({ ...selectedStep, status: nextStatus });
                }}
                className="w-full py-2 rounded-lg bg-[#0B3C7D] hover:bg-[#1565D8] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Alternar Status: {selectedStep.status}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nova Diretriz */}
      {newActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-[#06295A]">
              Adicionar Nova Diretriz DPO
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Diretriz</label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder="Ex.: Verificação quinzenal de tacógrafos"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-[#1565D8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável</label>
                <input
                  type="text"
                  value={actionOwner}
                  onChange={(e) => setActionOwner(e.target.value)}
                  placeholder="Ex.: Equipe de Manutenção"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-[#1565D8]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewActionModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (actionTitle.trim()) {
                    const newItem: DpoProcessStep = {
                      id: `dpo-${Date.now()}`,
                      code: `1.1.3.${steps.length + 1}`,
                      title: actionTitle,
                      owner: actionOwner || 'Equipe DPO',
                      frequency: 'Mensal',
                      target: '100% de conformidade',
                      status: 'Em Andamento',
                      description: 'Nova diretriz inserida pelo gestor da frota no padrão DPO Ambev.',
                      deliverables: ['Registro de auditoria', 'Evidência fotográfica'],
                    };
                    setSteps([...steps, newItem]);
                    setSelectedStep(newItem);
                    setActionTitle('');
                    setActionOwner('');
                    setNewActionModal(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[#06295A] text-white text-xs font-semibold cursor-pointer"
              >
                Salvar Diretriz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
