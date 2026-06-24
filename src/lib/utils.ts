import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    accepted: 'text-primary bg-primary/10',
    enRoute: 'text-warning-500 bg-warning-500/10',
    arrived: 'text-orange-400 bg-orange-400/10',
    inProgress: 'text-blue-400 bg-blue-400/10',
    completed: 'text-accent bg-accent/10',
    cancelled: 'text-red-400 bg-red-400/10',
  };
  return map[status] || 'text-muted bg-muted/10';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Finding Washer',
    accepted: 'Washer Assigned',
    enRoute: 'En Route',
    arrived: 'Arrived',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}
