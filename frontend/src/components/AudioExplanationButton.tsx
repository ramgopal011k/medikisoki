import React from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioExplanationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSpeaking?: boolean;
}

export const AudioExplanationButton: React.FC<AudioExplanationButtonProps> = ({ isSpeaking, className, ...props }) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      {isSpeaking && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
          <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 animate-pulse" />
        </>
      )}
      <button
        type="button"
        className={cn(
          "relative z-10 w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300",
          "bg-white border-2 border-primary/20 shadow-md hover:shadow-lg hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2",
          isSpeaking && "bg-primary text-white border-primary",
          !isSpeaking && "text-primary",
          className
        )}
        aria-label="Listen to explanation"
        {...props}
      >
        <Volume2 className={cn("w-8 h-8", isSpeaking && "animate-pulse")} />
      </button>
    </div>
  );
};
