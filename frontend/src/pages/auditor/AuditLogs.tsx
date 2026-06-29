import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, Input, Select, LoadingSkeleton, EmptyState } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { statusLabel } from '../../lib/format';

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    role: '',
    decision: '',
    biometricStatus: '',
    consentStatus: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => api.get('/audit/logs', { params: { ...filters, limit: 50 } }).then((r) => r.data),
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Log Audit</h1>
        <p className="text-slate-500">Filter berdasarkan tanggal, peran, sidik jari, consent, dan keputusan</p>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Input label="Tanggal Mulai" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          <Input label="Tanggal Akhir" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          <Select label="Peran" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">Semua</option>
            <option value="PATIENT">Pasien</option>
            <option value="DOCTOR">Dokter</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Select label="Keputusan" value={filters.decision} onChange={(e) => setFilters({ ...filters, decision: e.target.value })}>
            <option value="">Semua</option>
            <option value="ALLOWED">Diizinkan</option>
            <option value="DENIED">Ditolak</option>
          </Select>
          <Select label="Biometrik" value={filters.biometricStatus} onChange={(e) => setFilters({ ...filters, biometricStatus: e.target.value })}>
            <option value="">Semua</option>
            <option value="VERIFIED">Terverifikasi</option>
            <option value="FAILED">Gagal</option>
          </Select>
          <Select label="Consent" value={filters.consentStatus} onChange={(e) => setFilters({ ...filters, consentStatus: e.target.value })}>
            <option value="">Semua</option>
            <option value="ACTIVE">Aktif</option>
            <option value="DENIED">Ditolak</option>
          </Select>
        </div>

        {isLoading ? <LoadingSkeleton /> : (
          <>
            <h3 className="mb-3 font-semibold">Log Akses</h3>
            {!data?.accessLogs?.data?.length ? (
              <EmptyState title="Belum ada log akses" description="Ubah filter atau tunggu event akses masuk." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 pr-4">Aktor</th>
                      <th className="pb-3 pr-4">Pasien</th>
                      <th className="pb-3 pr-4">Biometrik</th>
                      <th className="pb-3 pr-4">Consent</th>
                      <th className="pb-3 pr-4">Keputusan</th>
                      <th className="pb-3 pr-4">Hash Tx</th>
                      <th className="pb-3">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accessLogs.data.map((l: { id: string; actor?: { username: string; role: string }; patient?: { patientCode: string }; biometricStatus: string; consentStatus: string; decision: string; txHash?: string; timestamp: string }) => (
                      <tr key={l.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4">{l.actor?.username}</td>
                        <td className="py-3 pr-4">{l.patient?.patientCode}</td>
                        <td className="py-3 pr-4"><StatusBadge status={l.biometricStatus} /></td>
                        <td className="py-3 pr-4">{statusLabel(l.consentStatus)}</td>
                        <td className="py-3 pr-4"><StatusBadge status={l.decision} /></td>
                        <td className="py-3 pr-4">
                          {l.txHash ? (
                            <Link to={`/auditor/transactions/${l.txHash}`} className="text-primary-600 hover:underline">
                              {l.txHash.slice(0, 12)}...
                            </Link>
                          ) : '-'}
                        </td>
                        <td className="py-3">{new Date(l.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
