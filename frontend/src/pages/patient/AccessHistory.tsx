import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, LoadingSkeleton, EmptyState } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export default function AccessHistory() {
  const { data: profile } = useQuery({
    queryKey: ['patient-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => api.get('/access-requests').then((r) => r.data.data),
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Access History</h1>
        <p className="text-slate-500">Who requested access to your records — {profile?.profile?.patientCode}</p>
      </div>

      <Card>
        <CardHeader title="Access Requests" />
        {isLoading ? <LoadingSkeleton /> : !requests?.length ? (
          <EmptyState title="No access requests" description="When doctors request access, they will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 pr-4">Doctor</th>
                  <th className="pb-3 pr-4">Record</th>
                  <th className="pb-3 pr-4">Purpose</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: { id: string; requester?: { username: string }; record?: { recordCode: string }; purpose: string; status: string; requestTime: string }) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{r.requester?.username}</td>
                    <td className="py-3 pr-4">{r.record?.recordCode}</td>
                    <td className="py-3 pr-4">{r.purpose}</td>
                    <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3">{new Date(r.requestTime).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
