import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, Input, Select, LoadingSkeleton, EmptyState } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

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
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-slate-500">Filter by date, role, fingerprint, consent, and decision</p>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Input label="Start Date" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          <Select label="Role" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">All</option>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Select label="Decision" value={filters.decision} onChange={(e) => setFilters({ ...filters, decision: e.target.value })}>
            <option value="">All</option>
            <option value="ALLOWED">Allowed</option>
            <option value="DENIED">Denied</option>
          </Select>
          <Select label="Biometric" value={filters.biometricStatus} onChange={(e) => setFilters({ ...filters, biometricStatus: e.target.value })}>
            <option value="">All</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Failed</option>
          </Select>
          <Select label="Consent" value={filters.consentStatus} onChange={(e) => setFilters({ ...filters, consentStatus: e.target.value })}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DENIED">Denied</option>
          </Select>
        </div>

        {isLoading ? <LoadingSkeleton /> : (
          <>
            <h3 className="mb-3 font-semibold">Access Logs</h3>
            {!data?.accessLogs?.data?.length ? (
              <EmptyState title="No access logs" description="Adjust filters or wait for access events." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 pr-4">Actor</th>
                      <th className="pb-3 pr-4">Patient</th>
                      <th className="pb-3 pr-4">Biometric</th>
                      <th className="pb-3 pr-4">Consent</th>
                      <th className="pb-3 pr-4">Decision</th>
                      <th className="pb-3 pr-4">Tx Hash</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accessLogs.data.map((l: { id: string; actor?: { username: string; role: string }; patient?: { patientCode: string }; biometricStatus: string; consentStatus: string; decision: string; txHash?: string; timestamp: string }) => (
                      <tr key={l.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4">{l.actor?.username}</td>
                        <td className="py-3 pr-4">{l.patient?.patientCode}</td>
                        <td className="py-3 pr-4"><StatusBadge status={l.biometricStatus} /></td>
                        <td className="py-3 pr-4">{l.consentStatus}</td>
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
