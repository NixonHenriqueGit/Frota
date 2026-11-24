import React, { useState } from 'react';
import { VehicleCategory } from '../types/fleet';

export interface DonutDatum {
  category: VehicleCategory;
  label: string;
  count: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  total: number;
  selectedCategory: 'Todos' | VehicleCategory;
  onSelectCategory: (cat: 'Todos' | VehicleCategory) => void;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  total,
  selectedCategory,
  onSelectCategory,
}) => {
  const [hovered, setHovered] = useState<VehicleCategory | null>(null);

  const size = 166;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0 w-[7rem] h-[7rem] xl:w-[8.25rem] xl:h-[8.25rem]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            data
              .filter((d) => d.count > 0)
              .map((item) => {
                const percent = item.count / total;
                const dashLength = percent * circumference;
                const gapLength = circumference - dashLength;
                const dashOffset = -cumulativePercent * circumference;
                cumulativePercent += percent;

                const isSelected =
                  selectedCategory === 'Todos' || selectedCategory === item.category;
                const isHovered = hovered === item.category;

                return (
                  <circle
                    key={item.category}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${Math.max(dashLength - 1.2, 0)} ${gapLength + 1.2}`}
                    strokeDashoffset={dashOffset}
                    opacity={isSelected ? 1 : 0.35}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHovered(item.category)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() =>
                      onSelectCategory(
                        selectedCategory === item.category ? 'Todos' : item.category
                      )
                    }
                  />
                );
              })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-2xl font-extrabold text-[#06295A] tabular-nums leading-none">
            {hovered
              ? data.find((d) => d.category === hovered)?.count ?? total
              : total}
          </span>
          <span className="text-[0.8rem] font-semibold text-slate-600 mt-1 max-w-[5.25rem] text-center truncate">
            {hovered
              ? data.find((d) => d.category === hovered)?.category
              : 'Veículos'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <ul className="w-full min-w-0 space-y-0.5 text-[0.82rem] leading-snug">
        {data.map((item) => {
          const isActive = selectedCategory === item.category;
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <li key={item.category}>
              <button
                type="button"
                onClick={() =>
                  onSelectCategory(isActive ? 'Todos' : item.category)
                }
                onMouseEnter={() => setHovered(item.category)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full flex items-center justify-between gap-2 px-2 py-[3px] rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 font-semibold text-[#06295A]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-left truncate" title={item.label}>
                    {item.label}
                  </span>
                </span>
                <span className="font-mono-tabular shrink-0 text-right whitespace-nowrap">
                  <span className="font-bold text-slate-900">{item.count}</span>{' '}
                  <span className="text-slate-500 font-medium">({pct}%)</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
