import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Activity } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, StatCard, LoadingSkeleton } from '../../components/ui';
import { actionLabel, statusLabel } from '../../lib/format';

export default function AuditorDashboard() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs-summary'],
    queryFn: () => api.get('/audit/logs', { params: { limit: 10 } }).then((r) => r.data),
  });

  const auditCount = logs?.auditLogs?.total || 0;
  const accessCount = logs?.accessLogs?.total || 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Auditor</h1>
        <p className="text-slate-500">Ringkasan audit, tanpa akses data klinis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Entri Log Audit" value={auditCount} icon={<ClipboardList size={24} />} />
        <StatCard label="Entri Log Akses" value={accessCount} icon={<Activity size={24} />} />
      </div>

      <Card>
        <CardHeader title="Event Audit Terbaru" />
        {isLoading ? <LoadingSkeleton /> : (
          <div className="space-y-2">
            {logs?.auditLogs?.data?.slice(0, 8).map((l: { id: string; action: string; decision: string; actor?: { username: string }; createdAt: string; txHash?: string }) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3 text-sm">
                <span className="font-medium">{actionLabel(l.action)}</span>
                <span>{l.actor?.username}</span>
                <span>{statusLabel(l.decision)}</span>
                {l.txHash && (
                  <Link to={`/auditor/transactions/${l.txHash}`} className="text-primary-600 hover:underline truncate max-w-xs">
                    {l.txHash.slice(0, 16)}...
                  </Link>
                )}
                <span className="text-slate-400">{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
