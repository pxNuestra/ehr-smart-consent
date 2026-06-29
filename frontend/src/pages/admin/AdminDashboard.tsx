import { useQuery } from '@tanstack/react-query';
import { Users, Settings, Activity } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, StatCard, LoadingSkeleton } from '../../components/ui';
import { serviceLabel } from '../../lib/format';

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
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-slate-500">Kelola sistem, tanpa akses data klinis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total User" value={users?.total || 0} icon={<Users size={24} />} />
        <StatCard label="Pasien" value={byRole('PATIENT')} icon={<Users size={24} />} />
        <StatCard label="Dokter" value={byRole('DOCTOR')} icon={<Users size={24} />} />
        <StatCard label="Sistem" value={serviceLabel(health?.status)} icon={<Activity size={24} />} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Status Sistem" />
          {health ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Database</dt><dd className="font-medium capitalize">{serviceLabel(health.services?.database)}</dd></div>
              <div className="flex justify-between"><dt>Blockchain</dt><dd className="font-medium capitalize">{serviceLabel(health.services?.blockchain)}</dd></div>
              <div className="flex justify-between"><dt>Versi</dt><dd>{health.version}</dd></div>
            </dl>
          ) : <LoadingSkeleton rows={3} />}
        </Card>
        <Card>
          <CardHeader title="Catatan Admin" subtitle="Data klinis sengaja tidak bisa diakses" />
          <p className="text-sm text-slate-600">
            Sebagai admin, lu hanya mengelola user, peran, dan konfigurasi sistem. Diagnosis, resep, dan hasil lab pasien terenkripsi dan tidak tersedia lewat endpoint admin.
          </p>
        </Card>
      </div>
    </div>
  );
}
