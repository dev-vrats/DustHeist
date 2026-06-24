import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'pending' | 'active' | 'done';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig = {
  online: { color: 'bg-accent', label: 'Online', pulse: true },
  offline: { color: 'bg-muted', label: 'Offline', pulse: false },
  busy: { color: 'bg-warning-500', label: 'Busy', pulse: true },
  pending: { color: 'bg-yellow-400', label: 'Pending', pulse: true },
  active: { color: 'bg-primary', label: 'Active', pulse: true },
  done: { color: 'bg-accent', label: 'Done', pulse: false },
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusDot({ status, size = 'md', showLabel = false }: StatusDotProps) {
  const config = statusConfig[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex">
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-75 animate-ping',
              config.color,
              sizeClasses[size]
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            config.color,
            sizeClasses[size]
          )}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-muted">{config.label}</span>
      )}
    </span>
  );
}
