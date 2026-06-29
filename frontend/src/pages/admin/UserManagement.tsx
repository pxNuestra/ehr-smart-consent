import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Card, CardHeader, Button, Input, Select, Modal, LoadingSkeleton } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'PATIENT' });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get('/users', { params: { search, limit: 50 } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-slate-500">Create and manage system accounts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add User</Button>
      </div>

      <Card>
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {isLoading ? <div className="mt-4"><LoadingSkeleton /></div> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 pr-4">Username</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((u: { id: string; username: string; email: string; role: string; status: string }) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{u.username}</td>
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4 capitalize">{u.role.toLowerCase()}</td>
                    <td className="py-3 pr-4"><StatusBadge status={u.status} /></td>
                    <td className="py-3">
                      <Button variant="danger" className="text-xs" onClick={() => deleteMutation.mutate(u.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User">
        <div className="space-y-4">
          <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
            <option value="AUDITOR">Auditor</option>
          </Select>
          <Button className="w-full" onClick={() => createMutation.mutate()}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}
