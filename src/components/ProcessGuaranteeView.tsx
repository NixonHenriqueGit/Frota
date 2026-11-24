import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Key,
  ShieldCheck,
} from 'lucide-react';

interface DpoDocumentItem {
  id: string;
  code: string;
  title: string;
  type: string;
  owner: string;
  frequency: string;
  target: string;
  status: 'Conforme' | 'Em Andamento';
  description: string;
  deliverables: string[];
}

const DPO_DOCUMENTS: DpoDocumentItem[] = [
  {
    id: 'doc-1',
    code: 'ANEXO-1',
    title: 'ANEXO 1 - RACI - CONTROLE DE DOCUMENTOS',
    type: 'Planilha Excel (.xlsx)',
    owner: 'Gestão de Frota / Logística',
    frequency: 'Mensal',
    target: '100% de responsabilidades mapeadas (RACI)',
    status: 'Conforme',
    description:
      'Matriz RACI oficial para controle e responsabilidades sobre a emissão, renovação e arquivamento de todos os documentos da frota Pau Brasil.',
    deliverables: [
      'Matriz de responsabilidades RACI atualizada',
      'Definição de Accountable, Responsible, Consulted e Informed',
      'Controle unificado de prazos e alçadas',
    ],
  },
  {
    id: 'doc-2',
    code: 'CHAVES-01',
    title: 'CONTROLE DE CHAVES',
    type: 'Documento PDF (.pdf)',
    owner: 'Portaria / Operações',
    frequency: 'Diário',
    target: 'Rastreabilidade total de chaves da frota',
    status: 'Conforme',
    description:
      'Normas e registro de retirada e devolução de chaves dos veículos da frota, garantindo o controle de acesso e responsabilidade por ativo.',
    deliverables: [
      'Termo de cautela de chaves',
      'Livro de registro de movimentação diária',
      'Auditoria de chaves reservas',
    ],
  },
  {
    id: 'doc-3',
    code: 'DPO-PILAR',
    title: 'DPO - Pilar Frota - Padrão Gestão de Documentos',
    type: 'Documento Word (.docx)',
    owner: 'Gerência Ambev / DPO Lead',
    frequency: 'Trimestral',
    target: 'Conformidade 100% com o padrão DPO Ambev',
    status: 'Conforme',
    description:
      'Manual oficial do Pilar Frota detailing os padrões DPO para auditoria, legalização, arquivos físicos/digitais e conformidade regulatória.',
    deliverables: [
      'Diretrizes de conformidade DPO Frota',
      'Checklist oficial de auditoria',
      'Plano de ação para manutenções e regularizações',
    ],
  },
];

export const ProcessGuaranteeView: React.FC = () => {
  const [selectedDocId, setSelectedDocId] = useState<string>(DPO_DOCUMENTS[0].id);

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
            Documentos oficiais de controle, RACI, gestão de chaves e padrão DPO Ambev para a frota Pau Brasil.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-right backdrop-blur-sm">
            <div className="text-[0.68rem] font-semibold text-blue-200">Arquivos Oficiais</div>
            <div className="font-mono-tabular text-lg font-extrabold text-white">03 Docs</div>
          </div>
        </div>
      </div>

      {/* Grid of the 3 Official Documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {DPO_DOCUMENTS.map((doc) => {
          const isSelected = selectedDocId === doc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDocId(doc.id)}
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
                    {doc.code}
                  </span>
                  <span
                    className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  {doc.type.includes('Excel') ? (
                    <FileSpreadsheet className={`w-4 h-4 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`} />
                  ) : doc.type.includes('PDF') ? (
                    <FileText className={`w-4 h-4 ${isSelected ? 'text-red-300' : 'text-red-600'}`} />
                  ) : (
                    <Key className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />
                  )}
                  <span className={`text-[0.7rem] font-semibold uppercase ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                    {doc.type}
                  </span>
                </div>

                <h3
                  className={`font-display text-[0.92rem] font-bold leading-snug tracking-tight ${
                    isSelected ? 'text-white' : 'text-[#06295A]'
                  }`}
                >
                  {doc.title}
                </h3>
              </div>

              <div
                className={`mt-4 pt-2.5 border-t text-[0.72rem] flex items-center justify-between ${
                  isSelected ? 'border-white/15 text-blue-100' : 'border-slate-100 text-slate-500'
                }`}
              >
                <span>{doc.frequency}</span>
                <span className="font-semibold">{doc.owner}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
