import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, Input, Button, LoadingSkeleton } from '../../components/ui';
import { actionLabel, purposeLabel, scopeLabel, statusLabel } from '../../lib/format';

export default function TransactionDetail() {
  const { txHash: paramHash } = useParams();
  const [searchHash, setSearchHash] = useState(paramHash || '');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tx-detail', paramHash || searchHash],
    queryFn: () => api.get(`/audit/transactions/${paramHash || searchHash}`).then((r) => r.data),
    enabled: !!(paramHash || searchHash),
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Detail Transaksi</h1>
        <p className="text-slate-500">Transaksi blockchain dan metadata audit</p>
      </div>

      {!paramHash && (
        <Card>
          <div className="flex gap-2">
            <Input placeholder="Masukkan hash transaksi..." value={searchHash} onChange={(e) => setSearchHash(e.target.value)} />
            <Button onClick={() => refetch()}>Cari</Button>
          </div>
        </Card>
      )}

      {isLoading ? <LoadingSkeleton /> : data && (
        <>
          <Card>
            <CardHeader title="Transaksi" subtitle={data.txHash} />
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-slate-500">Hash</dt><dd className="break-all font-mono text-xs">{data.txHash}</dd></div>
              <div><dt className="text-slate-500">Blok</dt><dd>{data.receipt?.blockNumber ?? 'N/A'}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd>{data.receipt?.status === 1 ? 'Berhasil' : 'Menunggu/Simulasi'}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Entri Audit" />
            {data.auditEntries?.length ? (
              <ul className="space-y-2 text-sm">
                {data.auditEntries.map((e: { id: string; action: string; decision: string; metadataHash: string; actor?: { username: string } }) => (
                  <li key={e.id} className="rounded border p-3">
                    <strong>{actionLabel(e.action)}</strong> — {e.actor?.username} — {statusLabel(e.decision)}
                    <p className="mt-1 font-mono text-xs text-slate-500">{e.metadataHash}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Tidak ada entri audit untuk hash ini</p>}
          </Card>

          <Card>
            <CardHeader title="Entri Consent" />
            {data.consentEntries?.length ? (
              <ul className="space-y-2 text-sm">
                {data.consentEntries.map((c: { id: string; accessScope: string; purpose: string; status: string; metadataHash: string }) => (
                  <li key={c.id} className="rounded border p-3">
                    Cakupan: {scopeLabel(c.accessScope)} | Tujuan: {purposeLabel(c.purpose)} | Status: {statusLabel(c.status)}
                    <p className="mt-1 font-mono text-xs text-slate-500">Meta: {c.metadataHash}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Tidak ada entri consent</p>}
          </Card>
        </>
      )}

      <Link to="/auditor/logs" className="text-primary-600 hover:underline text-sm">← Kembali ke Log Audit</Link>
    </div>
  );
}
