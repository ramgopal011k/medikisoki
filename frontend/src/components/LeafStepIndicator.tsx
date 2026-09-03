import React from 'react';
import { cn } from '@/lib/utils';

interface LeafStepIndicatorProps {
  total: number;
  current: number;
}

export const LeafStepIndicator: React.FC<LeafStepIndicatorProps> = ({ total, current }) => {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: total }).map((_, idx) => {
        const isActive = idx === current;
        const isPast = idx < current;
        return (
          <div
            key={idx}
            className={cn(
              "w-4 h-4 rounded-tl-full rounded-br-full rounded-tr-sm rounded-bl-sm transition-all duration-300",
              isActive ? "bg-primary scale-125" : isPast ? "bg-primary/50" : "bg-warmgray"
            )}
          />
        );
      })}
    </div>
  );
};
