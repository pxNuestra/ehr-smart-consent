import { useQuery, useMutation } from '@tanstack/react-query';
import { Fingerprint, FileSearch, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, StatCard, Button, LoadingSkeleton } from '../../components/ui';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['doctor-requests'],
    queryFn: () => api.get('/access-requests').then((r) => r.data),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post('/biometric/verify', { sampleData: 'demo-fingerprint', deviceId: 'DEV-SCANNER-001' }),
    onSuccess: (res) => {
      if (res.data.success) toast.success('Fingerprint verified');
      else toast.error(res.data.reason || 'Fingerprint failed');
    },
    onError: () => toast.error('Verification error'),
  });

  const pending = requests?.data?.filter((r: { status: string }) => r.status === 'PENDING').length || 0;
  const completed = requests?.data?.filter((r: { status: string }) => r.status === 'COMPLETED').length || 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
        <p className="text-slate-500">Welcome, Dr. {user?.username}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Requests" value={pending} icon={<FileSearch size={24} />} />
        <StatCard label="Completed Access" value={completed} icon={<CheckCircle size={24} />} />
        <StatCard label="Biometric" value="Required" icon={<Fingerprint size={24} />} />
      </div>

      <Card>
        <CardHeader title="Biometric Verification" subtitle="Verify fingerprint before accessing EHR" />
        <p className="mb-4 text-sm text-slate-600">
          Development mode: use sample <code className="rounded bg-slate-100 px-1">demo-fingerprint</code> with device DEV-SCANNER-001
        </p>
        <Button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>
          <Fingerprint size={18} className="mr-2" />
          {verifyMutation.isPending ? 'Verifying...' : 'Verify Fingerprint'}
        </Button>
      </Card>

      {isLoading ? <LoadingSkeleton /> : (
        <Card>
          <CardHeader title="Recent Access Requests" />
          <div className="space-y-2">
            {requests?.data?.slice(0, 5).map((r: { id: string; patient?: { patientCode: string }; status: string; requestTime: string }) => (
              <div key={r.id} className="flex justify-between rounded-lg border border-slate-100 p-3 text-sm">
                <span>{r.patient?.patientCode}</span>
                <span className="capitalize text-slate-500">{r.status.toLowerCase()}</span>
                <span className="text-slate-400">{new Date(r.requestTime).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
