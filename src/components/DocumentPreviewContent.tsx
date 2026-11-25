import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { PdfCanvasPreview } from './PdfCanvasPreview';

interface DocumentPreviewContentProps {
  fileDataUrl?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  onDownload: () => void;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Formato de arquivo inválido');
  }
  const meta = dataUrl.slice(0, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  if (meta.includes(';base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const decoded = decodeURIComponent(payload);
  return new TextEncoder().encode(decoded);
}

async function resolveFileBytes(fileDataUrl: string): Promise<Uint8Array> {
  if (fileDataUrl.startsWith('data:')) {
    return dataUrlToUint8Array(fileDataUrl);
  }
  const res = await fetch(fileDataUrl);
  return new Uint8Array(await res.arrayBuffer());
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const WordDocumentPreview: React.FC<{
  dataUrl: string;
  fileName: string;
  onDownload: () => void;
}> = ({ dataUrl, fileName, onDownload }) => {
  const styleRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomPct, setZoomPct] = useState(100);

  useEffect(() => {
    let cancelled = false;

    const renderWord = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (styleRef.current) styleRef.current.innerHTML = '';
      if (bodyRef.current) bodyRef.current.innerHTML = '';

      try {
        const bytes = await resolveFileBytes(dataUrl);
        if (cancelled) return;

        // OOXML (.docx) files are ZIP archives starting with PK (0x50 0x4B)
        const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
        if (!isZip) {
          setErrorMsg(
            'Este arquivo está no formato Word antigo (.doc binário). Salve como .docx ou PDF no Word para pré-visualizar diretamente aqui, ou clique em Baixar.'
          );
          setLoading(false);
          return;
        }

        if (!bodyRef.current || !styleRef.current) return;

        const bufferCopy = bytes.slice().buffer;
        await renderAsync(bufferCopy, bodyRef.current, styleRef.current, {
          className: 'pb-docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
        });

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Não foi possível renderizar este documento Word na plataforma.'
          );
          setLoading(false);
        }
      }
    };

    void renderWord();

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  if (errorMsg) {
    return (
      <div className="my-auto mx-auto text-center space-y-3 bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-md">
        <FileText className="w-12 h-12 text-[#1565D8] mx-auto" />
        <p className="text-sm font-bold text-[#06295A]">
          Não foi possível abrir a prévia deste arquivo Word
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#06295A] text-white text-xs font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar {fileName}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Compact Zoom / Info Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 mb-3 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0">
        <span className="text-xs font-semibold text-[#06295A] truncate">
          {loading ? 'Carregando documento Word...' : 'Documento Word (.docx)'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setZoomPct((z) => Math.max(60, z - 15))}
            title="Diminuir zoom"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-[#06295A] hover:bg-slate-50 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomPct(100)}
            className="px-2 py-1 rounded-md text-xs font-mono-tabular font-semibold text-[#06295A] hover:bg-slate-50 cursor-pointer"
          >
            {zoomPct}%
          </button>
          <button
            type="button"
            onClick={() => setZoomPct((z) => Math.min(175, z + 15))}
            title="Aumentar zoom"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-[#06295A] hover:bg-slate-50 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rendered Document Container */}
      <div className="relative flex-1 overflow-auto rounded-xl bg-slate-200/70 p-2 sm:p-4">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-600 bg-slate-100/80 z-10">
            <div className="w-7 h-7 border-2 border-[#06295A] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Renderizando documento Word...</span>
          </div>
        )}
        <div ref={styleRef} />
        <div
          ref={bodyRef}
          className="mx-auto origin-top transition-transform [&_.pb-docx-wrapper]:bg-transparent [&_.pb-docx-wrapper]:p-0 [&_.pb-docx]:shadow-md [&_.pb-docx]:mx-auto [&_.pb-docx]:mb-4"
          style={{
            zoom: zoomPct / 100,
          }}
        />
      </div>
    </div>
  );
};

interface ParsedSheet {
  name: string;
  rows: string[][];
}

const SpreadsheetPreview: React.FC<{
  dataUrl: string;
  fileName: string;
  onDownload: () => void;
}> = ({ dataUrl, fileName, onDownload }) => {
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const parseWorkbook = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const bytes = await resolveFileBytes(dataUrl);
        if (cancelled) return;

        const wb = XLSX.read(bytes, { type: 'array' });
        const parsed: ParsedSheet[] = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
            header: 1,
            defval: '',
          });
          const rows = rawRows.slice(0, 500).map((row) =>
            (Array.isArray(row) ? row : []).map((cell) =>
              cell == null ? '' : String(cell)
            )
          );
          return { name, rows };
        });

        if (!cancelled) {
          setSheets(parsed);
          setActiveSheetIdx(0);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Não foi possível ler esta planilha.'
          );
          setLoading(false);
        }
      }
    };

    void parseWorkbook();

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  const activeSheet = sheets[activeSheetIdx];
  const maxCols = useMemo(() => {
    if (!activeSheet) return 0;
    return activeSheet.rows.reduce((max, r) => Math.max(max, r.length), 0);
  }, [activeSheet]);

  if (loading) {
    return (
      <div className="my-auto flex flex-col items-center gap-2.5 text-slate-600">
        <div className="w-7 h-7 border-2 border-[#06295A] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Carregando planilha...</span>
      </div>
    );
  }

  if (errorMsg || !activeSheet) {
    return (
      <div className="my-auto mx-auto text-center space-y-3 bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-md">
        <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto" />
        <p className="text-sm font-bold text-[#06295A]">
          Não foi possível exibir esta planilha na prévia
        </p>
        <p className="text-xs text-slate-500">{errorMsg}</p>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#06295A] text-white text-xs font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar {fileName}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-2.5">
      {sheets.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
          {sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActiveSheetIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                idx === activeSheetIdx
                  ? 'bg-[#0B3C7D] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:text-[#06295A]'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-xl bg-white border border-slate-200 shadow-xs">
        {activeSheet.rows.length === 0 || maxCols === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Esta aba está vazia.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <tbody>
              {activeSheet.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    rIdx === 0
                      ? 'bg-[#EFF5FC] font-bold text-[#06295A] sticky top-0'
                      : 'border-t border-slate-100 hover:bg-slate-50'
                  }
                >
                  {Array.from({ length: maxCols }).map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 border-r border-slate-100 last:border-r-0 whitespace-nowrap"
                    >
                      {row[cIdx] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export const DocumentPreviewContent: React.FC<DocumentPreviewContentProps> = ({
  fileDataUrl,
  fileName,
  fileType,
  fileSize,
  onDownload,
}) => {
  const lower = fileName.toLowerCase();

  if (!fileDataUrl) {
    return (
      <div className="my-auto text-center space-y-3 bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-md">
        <FileText className="w-12 h-12 text-[#1565D8] mx-auto" />
        <p className="text-sm font-bold text-[#06295A]">Arquivo não anexado</p>
        <p className="text-xs text-slate-500">
          Anexe o arquivo para visualizá-lo na plataforma.
        </p>
      </div>
    );
  }

  if (fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
    return (
      <img
        src={fileDataUrl}
        alt={fileName}
        className="max-w-full max-h-full object-contain rounded-lg shadow"
      />
    );
  }

  if (fileType.includes('pdf') || lower.endsWith('.pdf')) {
    return (
      <PdfCanvasPreview
        dataUrl={fileDataUrl}
        fileName={fileName}
        onDownload={onDownload}
      />
    );
  }

  if (
    /\.docx?$/i.test(lower) ||
    fileType.includes('wordprocessingml') ||
    fileType.includes('msword')
  ) {
    return (
      <WordDocumentPreview
        dataUrl={fileDataUrl}
        fileName={fileName}
        onDownload={onDownload}
      />
    );
  }

  if (
    /\.(xlsx?|csv)$/i.test(lower) ||
    fileType.includes('spreadsheetml') ||
    fileType.includes('ms-excel') ||
    fileType.includes('csv')
  ) {
    return (
      <SpreadsheetPreview
        dataUrl={fileDataUrl}
        fileName={fileName}
        onDownload={onDownload}
      />
    );
  }

  return (
    <div className="text-center space-y-3 bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-md">
      <FileText className="w-12 h-12 text-[#1565D8] mx-auto" />
      <p className="text-sm font-bold text-[#06295A]">
        Pré-visualização indisponível para este formato
      </p>
      <p className="text-xs text-slate-500">
        {fileName} ({formatBytes(fileSize)}). Clique em <strong>Baixar</strong> para abrir no seu computador.
      </p>
      <button
        type="button"
        onClick={onDownload}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#06295A] text-white text-xs font-semibold cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Baixar {fileName}</span>
      </button>
    </div>
  );
};
