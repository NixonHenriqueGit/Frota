import React from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';

export const PLATFORM_CARD_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3';

export const PLATFORM_MAIN_CARD_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

export interface PlatformCardProps {
  kicker: string;
  countLabel: string;
  title: string;
  subtitle: string;
  statusLabel?: string;
  actionLabel?: string;
  selected?: boolean;
  size?: 'default' | 'lg';
  externalUrl?: string;
  onClick?: () => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  kicker,
  countLabel,
  title,
  subtitle,
  statusLabel = 'Módulo ativo',
  actionLabel = 'Abrir',
  selected = false,
  size = 'default',
  externalUrl,
  onClick,
}) => {
  const isLarge = size === 'lg';

  const cardClassName = `group relative flex flex-col justify-between ${
    isLarge
      ? 'min-h-[185px] sm:min-h-[205px] p-5'
      : 'min-h-[155px] sm:min-h-[168px] p-3.5'
  } rounded-xl border border-[#0B3C7D] bg-gradient-to-br from-[#072B5E] via-[#0B3C7D] to-[#1565D8] text-left text-white shadow-[0_6px_14px_rgba(11,60,125,0.2)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(11,60,125,0.3)] active:scale-[0.995] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
    selected ? 'ring-2 ring-[#38BDF8] brightness-110' : ''
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`${
            isLarge ? 'text-[0.68rem]' : 'text-[0.62rem]'
          } font-semibold uppercase tracking-wider text-blue-200/90 truncate`}
        >
          {kicker}
        </span>
        <span
          className={`font-mono-tabular ${
            isLarge ? 'text-[0.78rem]' : 'text-[0.72rem]'
          } font-bold text-blue-100 whitespace-nowrap shrink-0`}
        >
          {countLabel}
        </span>
      </div>

      <div className={isLarge ? 'my-3' : 'my-2.5'}>
        <h3
          className={`font-display ${
            isLarge ? 'text-[1.02rem]' : 'text-[0.9rem]'
          } font-bold leading-snug tracking-[0.02em] [word-spacing:0.18em] text-white`}
        >
          {title}
        </h3>
        <p
          className={`${
            isLarge ? 'text-[0.78rem] mt-2' : 'text-[0.72rem] mt-1.5'
          } leading-snug text-blue-100/85 line-clamp-3`}
        >
          {subtitle}
        </p>
      </div>

      <div
        className={`${
          isLarge ? 'pt-3' : 'pt-2.5'
        } border-t border-white/15 flex items-center justify-between gap-2`}
      >
        <span
          className={`${
            isLarge ? 'text-[0.72rem]' : 'text-[0.68rem]'
          } font-medium text-blue-100/80`}
        >
          {statusLabel}
        </span>
        <span
          className={`inline-flex items-center gap-1 ${
            isLarge ? 'text-[0.78rem]' : 'text-[0.72rem]'
          } font-bold text-white whitespace-nowrap shrink-0`}
        >
          <span>{actionLabel}</span>
          {externalUrl ? (
            <ExternalLink
              className={`${
                isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'
              } transition-transform duration-150 group-hover:translate-x-0.5`}
            />
          ) : (
            <ChevronRight
              className={`${
                isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'
              } transition-transform duration-150 group-hover:translate-x-0.5`}
            />
          )}
        </span>
      </div>
    </>
  );

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cardClassName}>
      {content}
    </button>
  );
};
