import React from 'react';
import { Sector } from '../types/fleet';

export interface SectorDatum {
  sector: Sector;
  count: number;
  color: string;
}

interface SectorBarChartProps {
  data: SectorDatum[];
  selectedSector: 'Todos' | Sector;
  onSelectSector: (sector: 'Todos' | Sector) => void;
}

const SECTOR_GRADIENTS: Record<Sector, string> = {
  Distribuição: 'linear-gradient(180deg, #2B8EFF 0%, #0D62D9 100%)',
  Vendas: 'linear-gradient(180deg, #26B966 0%, #148C48 100%)',
  Puxada: 'linear-gradient(180deg, #FF9124 0%, #E76708 100%)',
  Armazém: 'linear-gradient(180deg, #9C67FF 0%, #733CE0 100%)',
  Marketing: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
};

export const SectorBarChart: React.FC<SectorBarChartProps> = ({
  data,
  selectedSector,
  onSelectSector,
}) => {
  const maxVal = Math.max(20, ...data.map((d) => d.count));
  const step = Math.ceil(maxVal / 4 / 5) * 5 || 5;
  const ceiling = step * 4;
  const ticks = [0, step, step * 2, step * 3, ceiling];

  return (
    <div className="flex flex-col justify-center h-full">
      {/* Plot area: Y-axis ticks + horizontal gridlines + bars anchored to 0 */}
      <div className="relative h-[7.75rem] xl:h-[8.75rem] pl-7 pr-1 pt-4">
        {/* Horizontal Y-Axis Gridlines */}
        <div className="absolute inset-x-0 top-4 bottom-0 left-7 right-1 flex flex-col justify-between pointer-events-none">
          {[...ticks].reverse().map((t) => (
            <div key={t} className="relative flex items-center w-full">
              <span className="absolute -left-7 w-5 text-right text-[0.78rem] font-mono-tabular text-slate-500 leading-none">
                {t}
              </span>
              <div
                className={`w-full border-t ${
                  t === 0 ? 'border-slate-300' : 'border-slate-100'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Bars sitting cleanly on the 0 baseline */}
        <div className="relative z-10 w-full h-full grid grid-cols-5 gap-2 items-end">
          {data.map((item) => {
            const pct =
              ceiling > 0
                ? Math.max((item.count / ceiling) * 100, item.count > 0 ? 5 : 0)
                : 0;
            const isSelected = selectedSector === 'Todos' || selectedSector === item.sector;

            return (
              <button
                key={item.sector}
                type="button"
                onClick={() =>
                  onSelectSector(selectedSector === item.sector ? 'Todos' : item.sector)
                }
                title={`${item.sector}: ${item.count} veículos`}
                className="group flex flex-col items-center justify-end h-full cursor-pointer focus-visible:outline-none min-w-0"
              >
                <span className="text-[0.88rem] font-extrabold font-mono-tabular text-[#06295A] mb-1 transition-transform group-hover:-translate-y-0.5 leading-none">
                  {item.count}
                </span>
                <div className="w-full max-w-[2.85rem] flex-1 flex items-end justify-center">
                  <div
                    className="w-full rounded-t-lg transition-all duration-200 group-hover:brightness-110 shadow-[0_2px_6px_rgba(15,23,42,0.08)]"
                    style={{
                      height: `${pct}%`,
                      background: SECTOR_GRADIENTS[item.sector] || item.color,
                      opacity: isSelected ? 1 : 0.35,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* X-Axis Labels cleanly separated below the 0 baseline */}
      <div className="pl-7 pr-1 pt-1.5 grid grid-cols-5 gap-1">
        {data.map((item) => (
          <button
            key={item.sector}
            type="button"
            onClick={() =>
              onSelectSector(selectedSector === item.sector ? 'Todos' : item.sector)
            }
            className={`text-[0.8rem] leading-tight text-center whitespace-nowrap cursor-pointer transition-colors ${
              selectedSector === item.sector
                ? 'font-bold text-[#06295A]'
                : 'font-semibold text-slate-700 hover:text-[#06295A]'
            }`}
          >
            {item.sector}
          </button>
        ))}
      </div>
    </div>
  );
};
