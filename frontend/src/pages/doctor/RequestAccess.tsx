import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Card, CardHeader, Button, Select, LoadingSkeleton, EmptyState } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export default function RequestAccess() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ patientId: '', recordId: '', purpose: 'treatment' });

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then((r) => r.data),
  });

  const { data: records } = useQuery({
    queryKey: ['ehr-records', form.patientId],
    queryFn: () => api.get(`/ehr/patient/${form.patientId}`).then((r) => r.data),
    enabled: !!form.patientId,
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => api.get('/access-requests').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/access-requests', form),
    onSuccess: () => {
      toast.success('Access request created');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setForm({ patientId: '', recordId: '', purpose: 'treatment' });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Request Access</h1>
        <p className="text-slate-500">Submit EHR access request — requires active patient consent</p>
      </div>

      <Card>
        <CardHeader title="New Request" />
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Patient" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value, recordId: '' })}>
            <option value="">Select patient</option>
            {patients?.map((p: { id: string; patientCode: string }) => (
              <option key={p.id} value={p.id}>{p.patientCode}</option>
            ))}
          </Select>
          <Select label="Medical Record" value={form.recordId} onChange={(e) => setForm({ ...form, recordId: e.target.value })} disabled={!form.patientId}>
            <option value="">Select record</option>
            {records?.map((r: { id: string; recordCode: string; recordDate: string }) => (
              <option key={r.id} value={r.id}>{r.recordCode} — {new Date(r.recordDate).toLocaleDateString()}</option>
            ))}
          </Select>
          <Select label="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
            <option value="treatment">Treatment</option>
            <option value="consultation">Consultation</option>
            <option value="follow_up">Follow Up</option>
          </Select>
          <div className="flex items-end">
            <Button onClick={() => createMutation.mutate()} disabled={!form.patientId || !form.recordId || createMutation.isPending}>
              Submit Request
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="My Requests" />
        {isLoading ? <LoadingSkeleton /> : !requests?.length ? (
          <EmptyState title="No requests" description="Create an access request above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 pr-4">Patient</th>
                  <th className="pb-3 pr-4">Record</th>
                  <th className="pb-3 pr-4">Purpose</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: { id: string; patient?: { patientCode: string }; record?: { recordCode: string }; purpose: string; status: string; reason?: string }) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{r.patient?.patientCode}</td>
                    <td className="py-3 pr-4">{r.record?.recordCode}</td>
                    <td className="py-3 pr-4">{r.purpose}</td>
                    <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 text-slate-500">{r.reason || '-'}</td>
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
