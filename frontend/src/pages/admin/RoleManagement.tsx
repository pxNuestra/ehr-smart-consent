import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Card, CardHeader, Select, Button, LoadingSkeleton } from '../../components/ui';

export default function RoleManagement() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['users-roles'],
    queryFn: () => api.get('/users', { params: { limit: 100 } }).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/users/${id}`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['users-roles'] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Role Management</h1>
        <p className="text-slate-500">Assign roles: Patient, Doctor, Admin, Auditor</p>
      </div>

      <Card>
        <CardHeader title="User Roles" />
        {isLoading ? <LoadingSkeleton /> : (
          <div className="space-y-3">
            {data?.data?.map((u: { id: string; username: string; role: string }) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3">
                <span className="font-medium">{u.username}</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={u.role}
                    onChange={(e) => updateMutation.mutate({ id: u.id, role: e.target.value })}
                    className="w-40"
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="AUDITOR">Auditor</option>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
