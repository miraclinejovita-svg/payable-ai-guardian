import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DemoBadgeProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  label = 'Simulated Demo Record — No Real Money',
  size = 'md',
}) => {
  return (
    <div
      className={`badge badge-demo ${size === 'lg' ? 'py-2 px-3 text-base' : ''}`}
      role="note"
      aria-label={`Notice: ${label}`}
    >
      <AlertCircle size={size === 'lg' ? 20 : 16} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};
