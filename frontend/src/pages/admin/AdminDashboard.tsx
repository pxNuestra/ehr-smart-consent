import { useQuery } from '@tanstack/react-query';
import { Users, Settings, Activity } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, StatCard, LoadingSkeleton } from '../../components/ui';

export default function AdminDashboard() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/system/health').then((r) => r.data),
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const byRole = (role: string) => users?.data?.filter((u: { role: string }) => u.role === role).length || 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-500">System management — no clinical data access</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={users?.total || 0} icon={<Users size={24} />} />
        <StatCard label="Patients" value={byRole('PATIENT')} icon={<Users size={24} />} />
        <StatCard label="Doctors" value={byRole('DOCTOR')} icon={<Users size={24} />} />
        <StatCard label="System" value={health?.status || '...'} icon={<Activity size={24} />} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="System Health" />
          {health ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Database</dt><dd className="font-medium capitalize">{health.services?.database}</dd></div>
              <div className="flex justify-between"><dt>Blockchain</dt><dd className="font-medium capitalize">{health.services?.blockchain}</dd></div>
              <div className="flex justify-between"><dt>Version</dt><dd>{health.version}</dd></div>
            </dl>
          ) : <LoadingSkeleton rows={3} />}
        </Card>
        <Card>
          <CardHeader title="Admin Notice" subtitle="Clinical data is intentionally inaccessible" />
          <p className="text-sm text-slate-600">
            As administrator, you manage users, roles, and system configuration. Patient diagnoses,
            prescriptions, and lab results are encrypted and not available through admin endpoints.
          </p>
        </Card>
      </div>
    </div>
  );
}
