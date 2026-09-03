import React from 'react';
import { cn } from '@/lib/utils';

export const QuestionCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-sand rounded-2xl shadow-sm border border-warmgray p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
QuestionCard.displayName = "QuestionCard";
