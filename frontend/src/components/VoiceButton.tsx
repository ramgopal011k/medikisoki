import React from 'react';
import { Mic, Square, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'status'> {
  status?: 'idle' | 'listening' | 'error' | 'unsupported';
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ status = 'idle', className, ...props }) => {
  const isSpeaking = status === 'listening';
  const isError = status === 'error' || status === 'unsupported';

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
        disabled={isError}
        className={cn(
          "relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300",
          "bg-white border-2 border-primary/20 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/20",
          isSpeaking ? "bg-primary text-white border-primary" : "text-primary hover:border-primary/40",
          isError && "bg-warmgray/50 border-warmgray text-muted cursor-not-allowed hover:shadow-none hover:border-warmgray",
          className
        )}
        aria-label={isSpeaking ? "Stop listening" : "Speak your answer"}
        {...props}
      >
        {isSpeaking ? (
          <Square className="w-8 h-8 fill-current" />
        ) : isError ? (
          <MicOff className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>
    </div>
  );
};
