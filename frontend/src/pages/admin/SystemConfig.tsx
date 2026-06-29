import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Card, CardHeader, Input, Button, LoadingSkeleton } from '../../components/ui';
import { serviceLabel } from '../../lib/format';

export default function SystemConfig() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/system/health').then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.put('/system/config', { key: newKey, value: newValue }),
    onSuccess: () => {
      toast.success('Konfigurasi tersimpan');
      setNewKey('');
      setNewValue('');
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
    onError: () => toast.error('Gagal menyimpan konfigurasi'),
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Konfigurasi Sistem</h1>
        <p className="text-slate-500">Kelola pengaturan sistem dan cek status layanan</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Status Layanan" />
          {health ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Keseluruhan</dt><dd className="font-medium capitalize">{serviceLabel(health.status)}</dd></div>
              <div className="flex justify-between"><dt>Database</dt><dd>{serviceLabel(health.services?.database)}</dd></div>
              <div className="flex justify-between"><dt>Blockchain</dt><dd>{serviceLabel(health.services?.blockchain)}</dd></div>
            </dl>
          ) : <LoadingSkeleton rows={3} />}
        </Card>

        <Card>
          <CardHeader title="Tambah Konfigurasi" />
          <div className="space-y-4">
            <Input label="Key" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="config_key" />
            <Input label="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="config_value" />
            <Button onClick={() => saveMutation.mutate()} disabled={!newKey || !newValue}>Simpan Konfigurasi</Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Seed & Migrasi" subtitle="Jalankan lewat CLI" />
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-green-400">
{`npm run migrate
npm run seed
npm run contract:compile
npm run contract:deploy:local`}
        </pre>
      </Card>
    </div>
  );
}
