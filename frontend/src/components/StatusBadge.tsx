import clsx from 'clsx';

const variants: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  limited: 'bg-blue-100 text-blue-800',
  LIMITED: 'bg-blue-100 text-blue-800',
  revoked: 'bg-red-100 text-red-800',
  REVOKED: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
  EXPIRED: 'bg-amber-100 text-amber-800',
  allowed: 'bg-emerald-100 text-emerald-800',
  ALLOWED: 'bg-emerald-100 text-emerald-800',
  denied: 'bg-red-100 text-red-800',
  DENIED: 'bg-red-100 text-red-800',
  pending: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-slate-100 text-slate-700',
  completed: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  verified: 'bg-emerald-100 text-emerald-800',
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status] || 'bg-slate-100 text-slate-700'
      )}
    >
      {status.toLowerCase().replace('_', ' ')}
    </span>
  );
}
