import React from 'react';
import { Mic, Square, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'status'> {
  status?: 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';
  isListening?: boolean;
  isProcessing?: boolean;
  label?: string;
  showStatusLabel?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  status = 'idle',
  isListening,
  isProcessing,
  label,
  showStatusLabel = true,
  className,
  ...props
}) => {
  const isSpeaking = status === 'listening' || isListening;
  const isTranscribing = status === 'processing' || isProcessing;
  const isError = status === 'error';
  const isUnsupported = status === 'unsupported';
  const isDisabled = isError || isUnsupported || isTranscribing;

  const getStatusText = () => {
    if (label) return label;
    if (isTranscribing) return 'Transcribing audio...';
    if (isSpeaking) return 'Listening (tap to stop)';
    if (isError) return 'Microphone error';
    if (isUnsupported) return 'Voice not supported';
    return 'Tap to speak answer';
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        {isSpeaking && (
          <div className="absolute inset-[-4px] rounded-full border-2 border-primary/30" />
        )}
        {isTranscribing && (
          <div className="absolute inset-[-6px] rounded-full border-2 border-amber-500/50 animate-spin" />
        )}
        <button
          type="button"
          disabled={isDisabled}
          className={cn(
            "relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
            "focus:outline-none focus:ring-4 focus:ring-primary/20",
            isSpeaking && "bg-primary text-white border-2 border-primary shadow-lg scale-105",
            isTranscribing && "bg-amber-600 text-white border-2 border-amber-700 shadow-md",
            !isSpeaking && !isTranscribing && !isError && !isUnsupported && "bg-white border-2 border-primary/30 text-primary hover:border-primary hover:bg-primary/5 hover:shadow-lg",
            (isError || isUnsupported) && "bg-warmgray/50 border-2 border-warmgray text-muted cursor-not-allowed",
            className
          )}
          aria-label={getStatusText()}
          title={getStatusText()}
          {...props}
        >
          {isTranscribing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isSpeaking ? (
            <Square className="w-7 h-7 fill-current" />
          ) : isError || isUnsupported ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>
      {showStatusLabel && (
        <span
          className={cn(
            "text-xs font-body font-medium transition-colors duration-200",
            isSpeaking && "text-primary font-semibold",
            isTranscribing && "text-amber-700 font-semibold",
            isError && "text-danger",
            isUnsupported && "text-muted",
            !isSpeaking && !isTranscribing && !isError && !isUnsupported && "text-muted"
          )}
        >
          {getStatusText()}
        </span>
      )}
    </div>
  );
};
