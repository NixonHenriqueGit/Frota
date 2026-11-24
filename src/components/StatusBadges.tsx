import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { DocumentStatus, VehicleStatus } from '../types/fleet';

export const VehicleStatusBadge: React.FC<{ status: VehicleStatus }> = ({ status }) => {
  const isAtivo = status === 'Ativo';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
        isAtivo ? 'text-[#15803D]' : 'text-amber-700'
      }`}
    >
      {isAtivo ? (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#16A34A] text-white shrink-0">
          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
        </span>
      ) : (
        <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
      )}
      <span>{status}</span>
    </span>
  );
};

export const DocumentStatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const styles: Record<DocumentStatus, string> = {
    Regular: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'A vencer': 'bg-amber-100 text-amber-800 border-amber-200',
    Vencido: 'bg-red-100 text-red-800 border-red-200',
  };

  const icons: Record<DocumentStatus, React.ReactNode> = {
    Regular: <CheckCircle2 className="w-3 h-3 shrink-0" />,
    'A vencer': <Clock className="w-3 h-3 shrink-0" />,
    Vencido: <AlertTriangle className="w-3 h-3 shrink-0" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${styles[status]}`}
    >
      {icons[status]}
      <span>{status}</span>
    </span>
  );
};

export const EvidenceStatusBadge: React.FC<{
  status: 'Anexado' | 'Pendente';
  label?: string;
}> = ({ status, label }) => {
  const isAttached = status === 'Anexado';
  const displayLabel = label ?? (isAttached ? 'Aprovado' : 'Pendente');
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
        isAttached
          ? 'bg-[#D6F5E3] text-[#117A42]'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {!label && !isAttached && <XCircle className="w-3 h-3 shrink-0" />}
      <span>{displayLabel}</span>
    </span>
  );
};
