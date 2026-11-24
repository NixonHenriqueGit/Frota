import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { Vehicle } from '../types/fleet';
import {
  downloadFleetTemplateXlsx,
  ParsedFleetImport,
  parseFleetSpreadsheetFile,
  parseFleetSpreadsheetText,
  SPREADSHEET_HEADERS,
} from '../utils/fleetSpreadsheet';
import { formatCurrencyBRL, formatKmOrHours } from '../utils/formatters';

interface ImportFleetModalProps {
  isOpen: boolean;
  existingCount: number;
  onClose: () => void;
  onConfirmImport: (vehicles: Vehicle[], mode: 'merge' | 'replace') => void;
}

type InputTab = 'file' | 'paste';

export const ImportFleetModal: React.FC<ImportFleetModalProps> = ({
  isOpen,
  existingCount,
  onClose,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputTab, setInputTab] = useState<InputTab>('file');
  const [pasteText, setPasteText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFleetImport | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showAllUnrecognized, setShowAllUnrecognized] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setPasteText('');
    setErrorMsg('');
    setFileName('');
    setSelectedFile(null);
    setParsed(null);
    setDragActive(false);
    setLoading(false);
    setShowAllUnrecognized(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File, preferredSheetName?: string) => {
    setLoading(true);
    setErrorMsg('');
    setFileName(file.name);
    setSelectedFile(file);
    setShowAllUnrecognized(false);
    try {
      const result = await parseFleetSpreadsheetFile(file, preferredSheetName);
      if (result.matchedColumns.length === 0) {
        setParsed(result.availableSheets.length > 1 ? result : null);
        setErrorMsg(
          'Nenhuma coluna compatível foi identificada nesta aba. Verifique se a planilha possui o cabeçalho (PLACA, EMPRESA, STATUS, SETOR, TIPO, MODELO...).'
        );
      } else if (result.vehicles.length === 0) {
        setParsed(result.availableSheets.length > 1 ? result : null);
        setErrorMsg(
          'O cabeçalho foi reconhecido, mas nenhuma linha de veículo preenchida foi encontrada.'
        );
      } else {
        setParsed(result);
      }
    } catch {
      setParsed(null);
      setErrorMsg(
        'Não foi possível ler este arquivo. Envie uma planilha válida no formato .xlsx, .xls ou .csv.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!selectedFile) return;
    void processFile(selectedFile, sheetName);
  };

  const handlePasteAnalyze = () => {
    setErrorMsg('');
    setSelectedFile(null);
    setShowAllUnrecognized(false);
    if (!pasteText.trim()) {
      setErrorMsg('Cole os dados copiados do Excel antes de analisar.');
      return;
    }
    const result = parseFleetSpreadsheetText(pasteText);
    if (result.matchedColumns.length === 0) {
      setParsed(null);
      setErrorMsg(
        'Nenhuma coluna compatível foi reconhecida. Certifique-se de copiar também a linha de cabeçalho (PLACA, EMPRESA, Nº FROTA...).'
      );
    } else if (result.vehicles.length === 0) {
      setParsed(null);
      setErrorMsg('Cabeçalho encontrado, mas não há linhas de veículos preenchidas.');
    } else {
      setFileName('Dados colados do Excel');
      setParsed(result);
    }
  };

  const handleConfirm = () => {
    if (!parsed || parsed.vehicles.length === 0) return;
    onConfirmImport(parsed.vehicles, importMode);
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2E5C] text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileSpreadsheet className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold leading-tight truncate">
                Importar Planilha da Frota
              </h2>
              <p className="text-[11px] text-blue-100 truncate">
                Compatível com as {SPREADSHEET_HEADERS.length} colunas do Cadastro da Frota (.xlsx, .xls, .csv)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadFleetTemplateXlsx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Modelo (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar"
              className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Input method tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setInputTab('file');
                  setErrorMsg('');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  inputTab === 'file'
                    ? 'bg-white text-[#0A2E5C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar Arquivo (.xlsx / .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputTab('paste');
                  setErrorMsg('');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  inputTab === 'paste'
                    ? 'bg-white text-[#0A2E5C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Colar do Excel</span>
              </button>
            </div>

            {parsed && (
              <button
                type="button"
                onClick={resetState}
                className="text-xs font-semibold text-[#0B63CE] hover:underline cursor-pointer"
              >
                Limpar e escolher outra planilha
              </button>
            )}
          </div>

          {inputTab === 'file' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv,.tsv,.ods"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void processFile(file);
                  }
                  e.target.value = '';
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    void processFile(file);
                  }
                }}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-[#0A2E5C] bg-blue-50/70'
                    : 'border-slate-300 bg-slate-50/60 hover:border-[#0A2E5C]/60 hover:bg-slate-50'
                }`}
              >
                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A2E5C]/10 text-[#0A2E5C]">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {loading
                    ? 'Lendo planilha...'
                    : fileName
                      ? `Arquivo selecionado: ${fileName}`
                      : 'Clique para selecionar ou arraste sua planilha Excel / CSV aqui'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Formatos aceitos: .xlsx, .xls, .csv — todas as colunas (PLACA, EMPRESA, Nº FROTA,
                  COD.TIPO, STATUS, SETOR, TIPO, MODELO, checklist e FIPE) são mapeadas
                  automaticamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Selecione as linhas da planilha no Excel (incluindo o cabeçalho) e cole abaixo:
              </label>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Cole aqui as células copiadas diretamente do Excel (Ctrl+C / Ctrl+V)..."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs font-mono-tabular text-slate-800 focus:border-[#0A2E5C] focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePasteAnalyze}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] text-white text-xs font-semibold cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Processar Dados Colados</span>
                </button>
              </div>
            </div>
          )}

          {/* Worksheet Selector when multiple sheets exist */}
          {parsed && parsed.availableSheets.length > 1 && selectedFile && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-slate-700">
                Esta planilha possui {parsed.availableSheets.length} abas. Aba selecionada:
              </span>
              <select
                value={parsed.sheetName}
                onChange={(e) => handleSheetChange(e.target.value)}
                aria-label="Selecionar aba da planilha"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#0A2E5C] focus:border-[#0A2E5C] focus:outline-none cursor-pointer"
              >
                {parsed.availableSheets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error Feedback */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Results */}
          {parsed && parsed.vehicles.length > 0 && (
            <div className="space-y-3.5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {parsed.vehicles.length} veículo(s) prontos para importação ·{' '}
                      {parsed.matchedColumns.length} coluna(s) reconhecida(s)
                    </span>
                  </div>
                  {parsed.unrecognizedColumns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllUnrecognized((prev) => !prev)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      {parsed.unrecognizedColumns.length} coluna(s) ignorada(s)
                    </button>
                  )}
                </div>

                {showAllUnrecognized && parsed.unrecognizedColumns.length > 0 && (
                  <div className="pt-1 text-[11px] text-slate-600">
                    Colunas sem mapeamento: {parsed.unrecognizedColumns.join(', ')}
                  </div>
                )}
              </div>

              {(parsed.duplicatePlates.length > 0 || parsed.skippedRows > 0) && (
                <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-[11px] text-amber-800">
                  {parsed.duplicatePlates.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        <strong>Placas repetidas consolidadas:</strong>{' '}
                        {parsed.duplicatePlates.join(', ')} (foi mantida a última linha de cada
                        placa para evitar veículos duplicados).
                      </span>
                    </div>
                  )}
                  {parsed.skippedRows > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        {parsed.skippedRows} linha(s) ignorada(s) por não conter placa, nº da
                        frota ou modelo.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Import Mode */}
              {existingCount > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs cursor-pointer transition-colors ${
                      importMode === 'merge'
                        ? 'border-[#0A2E5C] bg-blue-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 accent-[#0A2E5C]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Mesclar pela Placa (Recomendado)
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Atualiza veículos com a mesma placa e adiciona os novos ao cadastro atual (
                        {existingCount} veículos).
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs cursor-pointer transition-colors ${
                      importMode === 'replace'
                        ? 'border-[#0A2E5C] bg-blue-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 accent-[#0A2E5C]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Substituir Frota Atual
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Remove os {existingCount} veículos atuais e carrega apenas os itens desta
                        planilha.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Preview Table */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>
                    Pré-visualização ({Math.min(parsed.vehicles.length, 8)} de{' '}
                    {parsed.vehicles.length} linhas)
                  </span>
                  <span>Aba: {parsed.sheetName}</span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-2.5 whitespace-nowrap">PLACA</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">EMPRESA</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">Nº FROTA</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">STATUS</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">SETOR</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">TIPO</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">MODELO</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">ANO</th>
                        <th className="py-2 px-2.5 whitespace-nowrap text-right">KM/HORAS</th>
                        <th className="py-2 px-2.5 whitespace-nowrap text-center">IDADE / HB</th>
                        <th className="py-2 px-2.5 whitespace-nowrap text-right">VALOR FIPE</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">CRLV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsed.vehicles.slice(0, 8).map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 font-mono-tabular font-bold text-[#0A2E5C] whitespace-nowrap">
                            {v.plate}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                            {v.company}
                          </td>
                          <td className="py-2 px-2.5 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {v.fleetNumber || '—'}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                            {v.status}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                            {v.sector}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                            {v.category}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                            {v.manufacturerModel}
                          </td>
                          <td className="py-2 px-2.5 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {v.yearFab}/{v.yearMod}
                          </td>
                          <td className="py-2 px-2.5 font-mono-tabular text-right text-slate-700 whitespace-nowrap">
                            {formatKmOrHours(v.kmOrHours, v.unit)}
                          </td>
                          <td className="py-2 px-2.5 font-mono-tabular text-center text-slate-600 whitespace-nowrap">
                            {v.fleetAgeYearMonths || (v.hbFrota ? 'Sim' : 'Não')}
                          </td>
                          <td className="py-2 px-2.5 font-mono-tabular text-right text-slate-700 whitespace-nowrap">
                            {formatCurrencyBRL(v.fipeValue)}
                          </td>
                          <td className="py-2 px-2.5 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {v.expiryDates.crlv || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!parsed || parsed.vehicles.length === 0}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A2E5C] hover:bg-[#0D3C78] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {parsed && parsed.vehicles.length > 0
                ? `Importar ${parsed.vehicles.length} Veículo${parsed.vehicles.length === 1 ? '' : 's'}`
                : 'Importar Veículos'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
