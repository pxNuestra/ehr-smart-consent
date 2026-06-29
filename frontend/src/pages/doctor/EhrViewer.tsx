import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Fingerprint, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { EhrData } from '../../types';
import { Card, CardHeader, Button, Select, Input, LoadingSkeleton, EmptyState } from '../../components/ui';
import { scopeLabel } from '../../lib/format';

export default function EhrViewer() {
  const [selectedRequest, setSelectedRequest] = useState('');
  const [fingerprint, setFingerprint] = useState('demo-fingerprint');
  const [ehrData, setEhrData] = useState<EhrData | null>(null);
  const [deniedAlasan, setDeniedAlasan] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => api.get('/access-requests?status=PENDING').then((r) => r.data.data),
  });

  const openMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.post(`/access-requests/${requestId}/verify-and-open`, {
        fingerprintSample: fingerprint,
        deviceId: 'DEV-SCANNER-001',
      }),
    onSuccess: (res) => {
      setEhrData(res.data.ehrData);
      setDeniedAlasan('');
      toast.success('Akses RME diberikan');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      const reason = err.response?.data?.error || 'Akses ditolak';
      setDeniedAlasan(reason);
      setEhrData(null);
      toast.error(reason);
    },
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Lihat RME</h1>
        <p className="text-slate-500">Lihat rekam medis hanya dengan sidik jari valid dan consent aktif</p>
      </div>

      <Card>
        <CardHeader title="Verifikasi & Buka Rekam Medis" subtitle="Wajib verifikasi biometrik" />
        {isLoading ? <LoadingSkeleton /> : (
          <div className="space-y-4">
            <Select label="Request Menunggu" value={selectedRequest} onChange={(e) => setSelectedRequest(e.target.value)}>
              <option value="">Pilih request</option>
              {requests?.map((r: { id: string; patient?: { patientCode: string }; record?: { recordCode: string } }) => (
                <option key={r.id} value={r.id}>
                  {r.patient?.patientCode} — {r.record?.recordCode}
                </option>
              ))}
            </Select>
            <Input
              label="Sample Sidik Jari (dev: demo-fingerprint)"
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value)}
            />
            <Button
              onClick={() => selectedRequest && openMutation.mutate(selectedRequest)}
              disabled={!selectedRequest || openMutation.isPending}
            >
              <Fingerprint size={18} className="mr-2" />
              {openMutation.isPending ? 'Memverifikasi...' : 'Verifikasi & Buka RME'}
            </Button>
          </div>
        )}
        {!requests?.length && !isLoading && (
          <EmptyState title="Belum ada request menunggu" description="Buat request akses dulu." />
        )}
      </Card>

      {deniedAlasan && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <strong>Akses Ditolak:</strong> {deniedAlasan}
        </div>
      )}

      {ehrData && (
        <Card>
          <CardHeader title={`Rekam Medis ${ehrData.recordCode}`} subtitle={`Cakupan: ${scopeLabel(ehrData.accessScope)}`} />
          <div className="grid gap-4 md:grid-cols-2">
            <div><h4 className="text-sm font-medium text-slate-500">Diagnosis</h4><p className="mt-1">{ehrData.diagnosis}</p></div>
            <div><h4 className="text-sm font-medium text-slate-500">Perawatan</h4><p className="mt-1">{ehrData.treatment}</p></div>
            <div><h4 className="text-sm font-medium text-slate-500">Resep</h4><p className="mt-1">{ehrData.prescription}</p></div>
            <div><h4 className="text-sm font-medium text-slate-500">Hasil Lab</h4><p className="mt-1">{ehrData.labResult}</p></div>
            <div className="md:col-span-2"><h4 className="text-sm font-medium text-slate-500">Catatan Kunjungan</h4><p className="mt-1">{ehrData.visitNote}</p></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <Eye size={16} /> Tampilan terenkripsi dibuka, akses dicatat di blockchain
          </div>
        </Card>
      )}
    </div>
  );
}
