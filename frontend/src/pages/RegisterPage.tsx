import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button, Input, Select, Card } from '../components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'ADMIN' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Account created. Please login.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900">Admin Setup / Register</h1>
        <p className="mt-1 text-sm text-slate-500">Create initial admin account for system setup</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="ADMIN">Admin</option>
            <option value="AUDITOR">Auditor</option>
          </Select>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-primary-600 hover:underline">Already have an account?</Link>
        </p>
      </Card>
    </div>
  );
}
