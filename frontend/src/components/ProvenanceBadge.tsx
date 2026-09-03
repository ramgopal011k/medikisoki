import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Database } from 'lucide-react';

export type ProvenanceType = 'system_derived' | 'doctor_entered' | 'patient_reported' | 'ocr_extracted';

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  label?: string;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ type, label, className }) => {
  const config = {
    system_derived: {
      color: 'bg-primary/10 text-primary border-primary/20',
      icon: Database,
      defaultLabel: 'System'
    },
    doctor_entered: {
      color: 'bg-success/10 text-success border-success/20',
      icon: CheckCircle2,
      defaultLabel: 'Verified'
    },
    patient_reported: {
      color: 'bg-danger/10 text-danger border-danger/20',
      icon: AlertCircle,
      defaultLabel: 'Self-Reported'
    },
    ocr_extracted: {
      color: 'bg-muted/10 text-muted border-muted/20',
      icon: Database,
      defaultLabel: 'Extracted'
    }
  };

  const { color, icon: Icon, defaultLabel } = config[type];
  const displayLabel = label || defaultLabel;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {displayLabel}
    </span>
  );
};
