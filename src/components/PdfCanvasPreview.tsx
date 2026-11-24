import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Download, FileText, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasPreviewProps {
  dataUrl: string;
  fileName: string;
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

interface RenderedPage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export const PdfCanvasPreview: React.FC<PdfCanvasPreviewProps> = ({
  dataUrl,
  fileName,
  onDownload,
}) => {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      setLoading(true);
      setErrorMsg(null);
      setPages([]);

      try {
        const bytes = dataUrl.startsWith('data:')
          ? dataUrlToUint8Array(dataUrl)
          : new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }

        setNumPages(pdf.numPages);
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const rendered: RenderedPage[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform:
              outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          }).promise;

          rendered.push({
            pageNumber: pageNum,
            imageUrl: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height,
          });
        }

        if (!cancelled) {
          setPages(rendered);
          setLoading(false);
        }
        void loadingTask.destroy();
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Não foi possível renderizar o PDF.'
          );
          setLoading(false);
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [dataUrl, scale]);

  if (errorMsg) {
    return (
      <div className="text-center space-y-3 bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-md">
        <FileText className="w-12 h-12 text-[#1565D8] mx-auto" />
        <p className="text-sm font-bold text-[#06295A]">
          Não foi possível exibir este PDF na prévia
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
    <div className="w-full h-full flex flex-col">
      {/* Compact Zoom / Page Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 mb-3 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0">
        <span className="text-xs font-semibold text-[#06295A]">
          {loading
            ? 'Carregando páginas do PDF...'
            : `${numPages} ${numPages === 1 ? 'página' : 'páginas'}`}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, Number((s - 0.25).toFixed(2))))}
            title="Diminuir zoom"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-[#06295A] hover:bg-slate-50 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setScale(1.25)}
            className="px-2 py-1 rounded-md text-xs font-mono-tabular font-semibold text-[#06295A] hover:bg-slate-50 cursor-pointer"
          >
            {Math.round((scale / 1.25) * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.25).toFixed(2))))}
            title="Aumentar zoom"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-[#06295A] hover:bg-slate-50 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pages Scroll Area */}
      <div className="flex-1 overflow-auto flex flex-col items-center gap-4 pb-4">
        {loading ? (
          <div className="my-auto flex flex-col items-center gap-2.5 text-slate-600">
            <div className="w-7 h-7 border-2 border-[#06295A] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Renderizando documento PDF...</span>
          </div>
        ) : (
          pages.map((p) => (
            <div
              key={p.pageNumber}
              className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden shrink-0"
              style={{ width: `${p.width}px`, maxWidth: '100%' }}
            >
              <img
                src={p.imageUrl}
                alt={`${fileName} - Página ${p.pageNumber}`}
                className="w-full h-auto block"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
