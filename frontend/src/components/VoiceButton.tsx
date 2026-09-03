import React from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSpeaking?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ isSpeaking, className, ...props }) => {
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
          "relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300",
          "bg-white border-2 border-primary/20 shadow-md hover:shadow-lg hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20",
          isSpeaking && "bg-primary text-white border-primary",
          !isSpeaking && "text-primary",
          className
        )}
        aria-label={isSpeaking ? "Stop listening" : "Speak your answer"}
        {...props}
      >
        {isSpeaking ? (
          <Square className="w-8 h-8 fill-current" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>
    </div>
  );
};
