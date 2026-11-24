import React, { useState } from 'react';
import {
  Camera,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Home,
  LogOut,
  RotateCcw,
  Settings,
  Truck,
  X,
} from 'lucide-react';
import { NavSection } from '../types/fleet';

export interface SidebarSummary {
  totalVehicles: number;
  activeVehicles: number;
  stoppedVehicles: number;
  expiringDocs: number;
  expiredDocs: number;
  pendingEvidences: number;
}

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  desktopHidden?: boolean;
  summary: SidebarSummary;
  userEmail?: string | null;
  userName?: string | null;
  onSignOut?: () => void;
  onOpenImportModal?: () => void;
  onLoadDefaultFleet?: () => void;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Home },
  { id: 'cadastro', label: 'Cadastro de Frota', icon: Truck },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'evidencias', label: 'Evidências', icon: Camera },
  { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
];

/**
 * Pau Brasil mark (bubble "P" with the tree cut out), vectorised from the
 * official artwork. Fill is a single colour so it works on any background.
 */
const MARK_VIEWBOX = '10.2 21.7 209.0 250.7';
const MARK_PATH =
  'M175.3 41.2 L168.2 36.5 L168.0 36.8 L165.8 35.3 L150.7 28.3 L140.3 25.2 L127.7 22.7 L118.8 21.8 L106.3 21.8 L96.3 23.0 L84.0 26.0 L78.2 28.0 L66.7 33.2 L58.5 37.8 L51.0 43.3 L42.3 51.0 L35.0 59.0 L29.0 67.2 L23.3 76.7 L17.3 89.8 L13.3 103.0 L10.7 117.7 L10.3 122.3 L10.2 270.3 L10.5 272.3 L11.2 271.7 L17.0 259.3 L22.7 251.7 L31.8 243.0 L36.7 239.8 L42.3 236.8 L48.0 234.7 L56.0 232.5 L65.5 231.2 L79.8 231.5 L92.0 233.2 L99.8 233.5 L101.8 233.3 L102.8 232.3 L106.2 225.7 L108.7 217.0 L109.5 210.7 L109.2 201.7 L107.8 197.7 L106.3 195.3 L96.7 184.2 L91.3 177.2 L91.0 175.5 L91.5 175.2 L93.0 175.8 L95.2 177.7 L104.8 187.5 L111.2 193.3 L113.2 194.7 L114.5 194.7 L116.0 194.0 L120.2 191.2 L125.7 185.7 L126.7 183.3 L127.5 182.5 L128.5 182.3 L129.7 182.8 L129.5 184.2 L122.0 196.7 L120.8 199.8 L120.0 204.7 L120.0 210.3 L121.0 215.8 L126.2 230.0 L127.2 231.2 L134.7 229.8 L148.2 226.0 L157.2 222.3 L167.5 216.8 L173.0 213.3 L183.8 204.8 L190.3 198.7 L198.8 188.3 L204.5 179.5 L209.5 170.0 L213.0 161.5 L216.2 151.0 L218.0 141.7 L219.0 132.0 L219.0 120.3 L218.0 110.7 L215.0 97.0 L212.0 88.2 L209.8 83.3 L209.8 80.3 L205.2 72.2 L198.8 63.2 L191.8 55.0 L186.5 49.8ZM116.2 74.5 L124.7 77.5 L128.2 79.2 L138.2 82.5 L145.2 86.0 L147.2 87.7 L147.5 89.0 L147.0 89.7 L146.0 90.0 L136.5 90.0 L112.7 88.2 L107.7 88.2 L107.5 88.5 L108.5 89.3 L115.5 92.5 L134.7 98.5 L141.2 101.0 L152.3 106.5 L158.2 110.0 L161.2 113.2 L161.0 114.0 L159.7 115.0 L156.5 115.2 L148.7 114.5 L131.5 112.2 L132.5 112.8 L149.5 119.0 L160.2 124.2 L168.2 130.2 L168.2 136.2 L167.2 136.7 L161.8 136.2 L143.5 132.3 L130.7 130.2 L120.5 127.7 L117.2 127.3 L119.7 128.8 L128.2 132.2 L138.0 136.8 L168.0 149.5 L168.2 160.2 L167.7 160.3 L162.2 158.8 L144.3 152.3 L134.0 149.2 L121.7 146.2 L119.7 146.2 L123.5 148.2 L139.2 153.5 L154.5 160.7 L160.2 164.2 L162.5 166.5 L162.8 167.8 L160.7 170.2 L157.7 170.5 L145.3 166.8 L136.5 163.5 L136.7 164.3 L149.8 173.2 L151.7 175.2 L151.7 176.7 L150.8 177.5 L149.3 178.2 L145.7 178.8 L136.7 177.0 L117.5 170.2 L105.5 166.7 L106.2 167.8 L116.7 176.7 L120.5 179.0 L123.7 181.7 L123.2 182.5 L117.0 181.7 L115.3 181.8 L114.5 182.8 L113.8 189.2 L112.7 189.7 L111.7 188.3 L110.5 184.7 L108.0 182.2 L103.2 180.0 L94.7 175.0 L65.7 162.0 L61.5 159.0 L62.2 157.8 L66.7 157.2 L89.8 157.0 L91.8 156.7 L91.5 156.2 L63.3 147.2 L58.8 144.8 L57.3 143.3 L57.2 142.5 L57.8 141.7 L59.3 141.2 L66.8 141.0 L104.2 145.8 L107.0 145.8 L101.8 144.0 L79.8 137.8 L75.7 137.0 L64.3 133.5 L61.3 132.2 L59.7 130.8 L57.3 128.2 L57.2 127.0 L58.3 126.0 L64.2 126.2 L83.0 128.8 L101.5 132.3 L108.3 132.8 L107.0 131.8 L72.3 122.2 L66.0 120.0 L62.7 117.8 L63.3 116.7 L68.0 116.2 L82.0 116.8 L110.5 121.0 L134.0 122.8 L134.0 122.2 L128.0 119.2 L117.8 115.5 L91.0 109.2 L79.5 106.0 L71.0 103.2 L68.8 102.2 L68.0 101.2 L68.7 100.0 L73.2 98.3 L84.7 98.2 L93.7 98.7 L106.7 100.5 L124.7 102.3 L124.0 101.7 L116.5 98.2 L89.5 88.7 L84.8 86.5 L82.3 85.0 L81.7 84.2 L82.7 83.0 L87.8 81.5 L92.3 81.2 L100.5 82.2 L111.8 82.8 L124.8 84.5 L124.5 84.0 L111.7 77.7 L109.5 76.0 L109.7 75.2 L110.3 74.7Z';

const PauBrasilTreeMark: React.FC<{ className?: string; fill?: string; fillOpacity?: number }> = ({
  className,
  fill = '#FFFFFF',
  fillOpacity = 1,
}) => (
  <svg viewBox={MARK_VIEWBOX} className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
    <path d={MARK_PATH} fill={fill} fillOpacity={fillOpacity} fillRule="evenodd" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  desktopHidden = false,
  summary,
  userEmail,
  userName,
  onSignOut,
  onOpenImportModal,
  onLoadDefaultFleet,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <aside className="relative flex h-full w-[228px] flex-col justify-between overflow-hidden bg-gradient-to-b from-[#001A6F] via-[#001A6E] to-[#00175E] text-white select-none">
      {/* Large brand mark watermark (lower half) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[11px] bottom-[200px] w-[227px] h-[272px]"
      >
        <PauBrasilTreeMark className="w-full h-full" fillOpacity={0.2} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Top Centered Logo Block */}
        <div className="relative px-4 pt-4 pb-7 text-center">
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="lg:hidden absolute right-3 top-3 p-1.5 rounded-md text-white/75 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mx-auto w-[60px] h-[72px] flex items-center justify-center mb-2">
            <PauBrasilTreeMark className="w-full h-full" />
          </div>
          <div className="font-display text-[23px] leading-none tracking-[0.1em] text-white whitespace-nowrap">
            <span className="font-light">PAU</span>
            <span className="font-extrabold">BRASIL</span>
          </div>
          <div className="font-display text-[13px] font-semibold text-white/95 tracking-tight mt-1">
            distribuidora ambev
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-0.5" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeCount =
              item.id === 'documentos'
                ? summary.expiredDocs > 0
                  ? summary.expiredDocs
                  : summary.expiringDocs > 0
                    ? summary.expiringDocs
                    : undefined
                : item.id === 'evidencias' && summary.pendingEvidences > 0
                  ? summary.pendingEvidences
                  : undefined;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`group relative w-full flex items-center justify-between gap-3 px-3.5 py-3.5 rounded-xl text-[14px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2B86FF] to-[#1469F2] text-white font-semibold shadow-[0_8px_20px_rgba(20,105,242,0.45)]'
                    : 'text-white/85 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-300/80 group-hover:text-white'
                    }`}
                    fill="currentColor"
                    fillOpacity={isActive ? (item.id === 'visao-geral' ? 1 : 0.25) : 0.28}
                  />
                  <span className="truncate">{item.label}</span>
                </span>

                {badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className={`tabular-nums text-[12px] font-bold min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center rounded-full ${
                      item.id === 'documentos' && summary.expiredDocs > 0
                        ? 'bg-[#E8161F] text-white shadow-sm'
                        : item.id === 'documentos'
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-500/90 text-white'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer + Settings Popover */}
      <div className="relative z-20 bg-[#00145A]/60">
        {settingsOpen && (
          <div className="mx-3 mb-2 rounded-xl bg-[#072656] border border-white/15 p-3 shadow-xl space-y-2 text-xs">
            {userEmail && (
              <div className="pb-2 border-b border-white/10">
                <div className="font-semibold text-white truncate">
                  {userName || 'Usuário'}
                </div>
                <div className="text-[11px] text-blue-200/75 truncate">{userEmail}</div>
              </div>
            )}

            {onOpenImportModal && (
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenImportModal();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span>Importar Planilha</span>
              </button>
            )}

            {onLoadDefaultFleet && (
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onLoadDefaultFleet();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Restaurar Frota Padrão</span>
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-red-200 hover:bg-red-500/20 transition-colors cursor-pointer text-left font-semibold"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sair da conta</span>
              </button>
            )}
          </div>
        )}

        <div className="mx-5 border-t border-[#1B3FA8]" />
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white leading-tight truncate">
              Pau Brasil
            </div>
            <div className="text-[12px] text-white/75 mt-0.5 truncate">
              Gestão de Frota v1.0
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            title="Configurações e Conta"
            aria-label="Configurações e Conta"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              settingsOpen
                ? 'bg-white/20 text-white'
                : 'text-blue-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      {!desktopHidden && (
        <div className="hidden lg:block shrink-0 h-screen sticky top-0 no-print">
          {sidebarContent}
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
