import { useQuery } from '@tanstack/react-query';
import { Shield, History, Users } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, StatCard, LoadingSkeleton } from '../../components/ui';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['patient-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });

  const patientId = profile?.profile?.id;
  const { data: consents } = useQuery({
    queryKey: ['patient-consents', patientId],
    queryFn: () => api.get(`/consents/patient/${patientId}`).then((r) => r.data),
    enabled: !!patientId,
  });

  const active = consents?.filter((c: { status: string }) => c.status === 'ACTIVE').length || 0;
  const revoked = consents?.filter((c: { status: string }) => c.status === 'REVOKED').length || 0;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patient Dashboard</h1>
        <p className="text-slate-500">Welcome, {user?.username}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active Consents" value={active} icon={<Shield size={24} />} />
        <StatCard label="Revoked Consents" value={revoked} icon={<History size={24} />} />
        <StatCard label="Patient Code" value={profile?.profile?.patientCode || '-'} icon={<Users size={24} />} />
      </div>

      <Card>
        <CardHeader title="Your Profile" subtitle="Non-clinical identity information" />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Patient Code</dt><dd className="font-medium">{profile?.profile?.patientCode}</dd></div>
          <div><dt className="text-sm text-slate-500">Gender</dt><dd className="font-medium">{profile?.profile?.gender}</dd></div>
          <div><dt className="text-sm text-slate-500">Age</dt><dd className="font-medium">{profile?.profile?.age}</dd></div>
          <div><dt className="text-sm text-slate-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
