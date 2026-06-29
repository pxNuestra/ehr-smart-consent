import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Consent } from '../../types';
import { Card, CardHeader, Button, Select, Input, Modal, LoadingSkeleton, EmptyState } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { purposeLabel, scopeLabel } from '../../lib/format';

export default function ConsentManagement() {
  const queryClient = useQueryClient();
  const [grantOpen, setGrantOpen] = useState(false);
  const [limitOpen, setBatasiOpen] = useState<Consent | null>(null);
  const [revokeOpen, setCabutOpen] = useState<Consent | null>(null);
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
      toast.success('Consent berhasil dicatat di blockchain');
      queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setGrantOpen(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Gagal'),
  });

  const limitMutation = useMutation({
    mutationFn: ({ id, limitationType, newValue }: { id: string; limitationType: string; newValue: string }) =>
      api.put(`/consents/${id}/limit`, { limitationType, newValue }),
    onSuccess: () => {
      toast.success('Consent berhasil dibatasi');
      queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setBatasiOpen(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Gagal'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/consents/${id}/revoke`),
    onSuccess: () => {
      toast.success('Consent berhasil dicabut');
      queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setCabutOpen(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Gagal'),
  });

  const defaultEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Consent</h1>
          <p className="text-slate-500">Beri, batasi, atau cabut akses dokter ke rekam medis Anda</p>
        </div>
        <Button onClick={() => { setForm({ ...form, endTime: defaultEnd }); setGrantOpen(true); }}>
          Beri Akses
        </Button>
      </div>

      <Card>
        {isLoading ? <LoadingSkeleton /> : !consents?.length ? (
          <EmptyState title="Belum ada consent" description="Beri akses ke dokter dulu buat mulai." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 pr-4">Dokter</th>
                  <th className="pb-3 pr-4">Cakupan</th>
                  <th className="pb-3 pr-4">Tujuan</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Berakhir</th>
                  <th className="pb-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{c.grantee?.username}</td>
                    <td className="py-3 pr-4">{scopeLabel(c.accessScope)}</td>
                    <td className="py-3 pr-4">{purposeLabel(c.purpose)}</td>
                    <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3 pr-4">{new Date(c.endTime).toLocaleDateString()}</td>
                    <td className="py-3 space-x-2">
                      {c.status === 'ACTIVE' && (
                        <>
                          <Button variant="outline" className="text-xs" onClick={() => setBatasiOpen(c)}>Batasi</Button>
                          <Button variant="danger" className="text-xs" onClick={() => setCabutOpen(c)}>Cabut</Button>
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

      <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title="Beri Akses">
        <div className="space-y-4">
          <Select label="Dokter" value={form.granteeUserId} onChange={(e) => setForm({ ...form, granteeUserId: e.target.value })}>
            <option value="">Pilih dokter</option>
            {doctors?.map((d: { userId: string; username: string; specialty: string }) => (
              <option key={d.userId} value={d.userId}>{d.username} — {d.specialty}</option>
            ))}
          </Select>
          <Select label="Jenis Data" value={form.accessScope} onChange={(e) => setForm({ ...form, accessScope: e.target.value })}>
            <option value="full_ehr">RME Lengkap</option>
            <option value="diagnosis">Diagnosis Saja</option>
            <option value="lab_results">Hasil Lab</option>
          </Select>
          <Select label="Tujuan" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
            <option value="treatment">Perawatan</option>
            <option value="consultation">Konsultasi</option>
            <option value="follow_up">Kontrol Lanjutan</option>
          </Select>
          <Input label="Tanggal Akhir" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <Button className="w-full" onClick={() => grantMutation.mutate(form)} disabled={grantMutation.isPending || !form.granteeUserId}>
            {grantMutation.isPending ? 'Memberi akses...' : 'Beri Akses'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!limitOpen} onClose={() => setBatasiOpen(null)} title="Batasi Consent">
        {limitOpen && (
          <div className="space-y-4">
            <Select label="Jenis Batasan" id="limitType" defaultValue="endTime">
              <option value="endTime">Kurangi Waktu Akhir</option>
              <option value="dataType">Ubah Jenis Data</option>
              <option value="purpose">Ubah Tujuan</option>
            </Select>
            <Input label="Nilai Baru" id="limitValue" placeholder="Unix timestamp atau nilai baru" />
            <Button className="w-full" onClick={() => {
              const type = (document.getElementById('limitType') as HTMLSelectElement).value;
              const val = (document.getElementById('limitValue') as HTMLInputElement).value;
              limitMutation.mutate({ id: limitOpen.id, limitationType: type, newValue: val });
            }}>Terapkan Batasan</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!revokeOpen} onClose={() => setCabutOpen(null)} title="Cabut Consent">
        {revokeOpen && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Cabut akses untuk {revokeOpen.grantee?.username}? Ini akan dicatat di blockchain.</p>
            <Button variant="danger" className="w-full" onClick={() => revokeMutation.mutate(revokeOpen.id)}>Konfirmasi Cabut</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
