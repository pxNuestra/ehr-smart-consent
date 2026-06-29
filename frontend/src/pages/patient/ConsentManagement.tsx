import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Consent } from '../../types';
import { Card, CardHeader, Button, Select, Input, Modal, LoadingSkeleton, EmptyState } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export default function ConsentManagement() {
  const queryClient = useQueryClient();
  const [grantOpen, setGrantOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState<Consent | null>(null);
  const [revokeOpen, setRevokeOpen] = useState<Consent | null>(null);
  const [form, setForm] = useState({ granteeUserId: '', accessScope: 'full_ehr', purpose: 'treatment', endTime: '' });

  const { data: profile } = useQuery({
    queryKey: ['patient-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });
  const patientId = profile?.profile?.id;

  const { data: consents, isLoading } = useQuery({
    queryKey: ['patient-consents', patientId],
    queryFn: () => api.get(`/consents/patient/${patientId}`).then((r) => r.data as Consent[]),
    enabled: !!patientId,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/doctors').then((r) => r.data),
  });

  const grantMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/consents/grant', { ...data, endTime: new Date(data.endTime).toISOString() }),
    onSuccess: () => {
      toast.success('Consent granted on blockchain');
      queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setGrantOpen(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const limitMutation = useMutation({
    mutationFn: ({ id, limitationType, newValue }: { id: string; limitationType: string; newValue: string }) =>
      api.put(`/consents/${id}/limit`, { limitationType, newValue }),
    onSuccess: () => {
      toast.success('Consent limited');
      queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setLimitOpen(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/consents/${id}/revoke`),
    onSuccess: () => {
      toast.success('Consent revoked');
      queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setRevokeOpen(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const defaultEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Consent Management</h1>
          <p className="text-slate-500">Grant, limit, or revoke doctor access to your records</p>
        </div>
        <Button onClick={() => { setForm({ ...form, endTime: defaultEnd }); setGrantOpen(true); }}>
          Grant Access
        </Button>
      </div>

      <Card>
        {isLoading ? <LoadingSkeleton /> : !consents?.length ? (
          <EmptyState title="No consents yet" description="Grant access to a doctor to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 pr-4">Doctor</th>
                  <th className="pb-3 pr-4">Scope</th>
                  <th className="pb-3 pr-4">Purpose</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Expires</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{c.grantee?.username}</td>
                    <td className="py-3 pr-4">{c.accessScope}</td>
                    <td className="py-3 pr-4">{c.purpose}</td>
                    <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3 pr-4">{new Date(c.endTime).toLocaleDateString()}</td>
                    <td className="py-3 space-x-2">
                      {c.status === 'ACTIVE' && (
                        <>
                          <Button variant="outline" className="text-xs" onClick={() => setLimitOpen(c)}>Limit</Button>
                          <Button variant="danger" className="text-xs" onClick={() => setRevokeOpen(c)}>Revoke</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title="Grant Access">
        <div className="space-y-4">
          <Select label="Doctor" value={form.granteeUserId} onChange={(e) => setForm({ ...form, granteeUserId: e.target.value })}>
            <option value="">Select doctor</option>
            {doctors?.map((d: { userId: string; username: string; specialty: string }) => (
              <option key={d.userId} value={d.userId}>{d.username} — {d.specialty}</option>
            ))}
          </Select>
          <Select label="Data Type" value={form.accessScope} onChange={(e) => setForm({ ...form, accessScope: e.target.value })}>
            <option value="full_ehr">Full EHR</option>
            <option value="diagnosis">Diagnosis Only</option>
            <option value="lab_results">Lab Results</option>
          </Select>
          <Select label="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
            <option value="treatment">Treatment</option>
            <option value="consultation">Consultation</option>
            <option value="follow_up">Follow Up</option>
          </Select>
          <Input label="End Date" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <Button className="w-full" onClick={() => grantMutation.mutate(form)} disabled={grantMutation.isPending || !form.granteeUserId}>
            {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!limitOpen} onClose={() => setLimitOpen(null)} title="Limit Consent">
        {limitOpen && (
          <div className="space-y-4">
            <Select label="Limitation Type" id="limitType" defaultValue="endTime">
              <option value="endTime">Reduce End Time</option>
              <option value="dataType">Change Data Type</option>
              <option value="purpose">Change Purpose</option>
            </Select>
            <Input label="New Value" id="limitValue" placeholder="Unix timestamp or new value" />
            <Button className="w-full" onClick={() => {
              const type = (document.getElementById('limitType') as HTMLSelectElement).value;
              const val = (document.getElementById('limitValue') as HTMLInputElement).value;
              limitMutation.mutate({ id: limitOpen.id, limitationType: type, newValue: val });
            }}>Apply Limitation</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!revokeOpen} onClose={() => setRevokeOpen(null)} title="Revoke Consent">
        {revokeOpen && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Revoke access for {revokeOpen.grantee?.username}? This will be recorded on blockchain.</p>
            <Button variant="danger" className="w-full" onClick={() => revokeMutation.mutate(revokeOpen.id)}>Confirm Revoke</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
