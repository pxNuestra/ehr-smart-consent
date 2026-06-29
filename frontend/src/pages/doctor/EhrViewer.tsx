import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Fingerprint, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { EhrData } from '../../types';
import { Card, CardHeader, Button, Select, Input, LoadingSkeleton, EmptyState } from '../../components/ui';

export default function EhrViewer() {
  const [selectedRequest, setSelectedRequest] = useState('');
  const [fingerprint, setFingerprint] = useState('demo-fingerprint');
  const [ehrData, setEhrData] = useState<EhrData | null>(null);
  const [deniedReason, setDeniedReason] = useState('');

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
      setDeniedReason('');
      toast.success('EHR access granted');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      const reason = err.response?.data?.error || 'Access denied';
      setDeniedReason(reason);
      setEhrData(null);
      toast.error(reason);
    },
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">EHR Viewer</h1>
        <p className="text-slate-500">View records only with valid fingerprint and active consent</p>
      </div>

      <Card>
        <CardHeader title="Verify & Open Record" subtitle="Biometric verification required" />
        {isLoading ? <LoadingSkeleton /> : (
          <div className="space-y-4">
            <Select label="Pending Request" value={selectedRequest} onChange={(e) => setSelectedRequest(e.target.value)}>
              <option value="">Select request</option>
              {requests?.map((r: { id: string; patient?: { patientCode: string }; record?: { recordCode: string } }) => (
                <option key={r.id} value={r.id}>
                  {r.patient?.patientCode} — {r.record?.recordCode}
                </option>
              ))}
            </Select>
            <Input
              label="Fingerprint Sample (dev: demo-fingerprint)"
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value)}
            />
            <Button
              onClick={() => selectedRequest && openMutation.mutate(selectedRequest)}
              disabled={!selectedRequest || openMutation.isPending}
            >
              <Fingerprint size={18} className="mr-2" />
              {openMutation.isPending ? 'Verifying...' : 'Verify & Open EHR'}
            </Button>
          </div>
        )}
        {!requests?.length && !isLoading && (
          <EmptyState title="No pending requests" description="Create an access request first." />
        )}
      </Card>

      {deniedReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <strong>Access Denied:</strong> {deniedReason}
        </div>
      )}

      {ehrData && (
        <Card>
          <CardHeader title={`Record ${ehrData.recordCode}`} subtitle={`Scope: ${ehrData.accessScope}`} />
          <div className="grid gap-4 md:grid-cols-2">
            <div><h4 className="text-sm font-medium text-slate-500">Diagnosis</h4><p className="mt-1">{ehrData.diagnosis}</p></div>
            <div><h4 className="text-sm font-medium text-slate-500">Treatment</h4><p className="mt-1">{ehrData.treatment}</p></div>
            <div><h4 className="text-sm font-medium text-slate-500">Prescription</h4><p className="mt-1">{ehrData.prescription}</p></div>
            <div><h4 className="text-sm font-medium text-slate-500">Lab Results</h4><p className="mt-1">{ehrData.labResult}</p></div>
            <div className="md:col-span-2"><h4 className="text-sm font-medium text-slate-500">Visit Note</h4><p className="mt-1">{ehrData.visitNote}</p></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <Eye size={16} /> Decrypted view — access logged on blockchain
          </div>
        </Card>
      )}
    </div>
  );
}
