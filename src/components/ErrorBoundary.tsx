import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase';
import firestoreRulesRaw from '../../firestore.rules?raw';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isFreeDailyReadQuota: boolean;
  isPermissionError: boolean;
  copiedRules: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isFreeDailyReadQuota: false,
      isPermissionError: false,
      copiedRules: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const rawMsg = error?.message ?? 'Erro inesperado na aplicação.';
    let parsedMessage = rawMsg;
    try {
      const parsed = JSON.parse(rawMsg) as { error?: string; operationType?: string; path?: string };
      if (parsed && typeof parsed.error === 'string') {
        parsedMessage = `${parsed.error}${parsed.path ? ` (${parsed.operationType ?? 'operação'} em ${parsed.path})` : ''}`;
      }
    } catch {
      // Keep plain error message
    }

    const isQuotaError = parsedMessage.includes('Quota exceeded');
    const isFreeDailyReadQuota = parsedMessage.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );
    const isPermissionError =
      parsedMessage.includes('Missing or insufficient permissions') ||
      parsedMessage.includes('permission-denied');

    return {
      hasError: true,
      errorMessage: parsedMessage,
      isQuotaError,
      isFreeDailyReadQuota,
      isPermissionError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  private handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(firestoreRulesRaw);
      this.setState({ copiedRules: true });
      window.setTimeout(() => this.setState({ copiedRules: false }), 2500);
    } catch {
      // Fallback textarea copy if clipboard API is blocked in iframe
      const textarea = document.createElement('textarea');
      textarea.value = firestoreRulesRaw;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.setState({ copiedRules: true });
      window.setTimeout(() => this.setState({ copiedRules: false }), 2500);
    }
  };

  render() {
    if (this.state.hasError) {
      const consoleDbId =
        FIRESTORE_DATABASE_ID === '(default)' ? '-default-' : FIRESTORE_DATABASE_ID;
      const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${consoleDbId}/data?openUpgradeDialog=true`;
      const rulesUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${consoleDbId}/rules`;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F7FA] p-4">
          <div className="max-w-lg w-full rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0A2E5C] text-white flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
              <h1 className="font-display text-base font-bold">
                Falha de Conexão ou Permissão com o Banco de Dados
              </h1>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-700 leading-relaxed">
              {this.state.isQuotaError ? (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
                  <p className="font-semibold">
                    A cota gratuita diária do Firestore foi atingida. Ela será redefinida
                    automaticamente amanhã.
                  </p>
                  {this.state.isFreeDailyReadQuota && (
                    <p>
                      Para ampliar a capacidade imediatamente, acesse o console do Firebase:{' '}
                      <a
                        href={upgradeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-semibold text-[#0A2E5C]"
                      >
                        Abrir Console do Firestore
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 font-mono break-words">
                    {this.state.errorMessage}
                  </p>
                  {this.state.isPermissionError && (
                    <div className="space-y-2.5 rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 text-slate-700">
                      <p className="font-semibold text-[#0A2E5C]">
                        As regras do Firestore precisam ser publicadas no projeto{' '}
                        <span className="font-mono">{FIREBASE_PROJECT_ID}</span>:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11.5px]">
                        <li>Clique em <strong>Copiar firestore.rules</strong> abaixo.</li>
                        <li>Abra o Console do Firebase, substitua todo o conteúdo na aba <strong>Regras</strong> e clique em <strong>Publicar</strong>.</li>
                        <li>Volte aqui e clique em <strong>Recarregar Plataforma</strong>.</li>
                      </ol>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={this.handleCopyRules}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer"
                        >
                          {this.state.copiedRules ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Regras copiadas!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar firestore.rules</span>
                            </>
                          )}
                        </button>
                        <a
                          href={rulesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-[#0A2E5C] text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Regras no Firebase</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recarregar Plataforma</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
