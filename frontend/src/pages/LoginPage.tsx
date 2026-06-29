import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login berhasil');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login gagal';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Stethoscope className="mx-auto text-primary-600" size={40} />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Masuk</h1>
          <p className="text-sm text-slate-500">Hibah - Kontrol Akses Rekam Medis Elektronik Berbasis Pasien</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username atau Email" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input label="Kata Sandi" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sedang masuk...' : 'Masuk'}
          </Button>
        </form>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-medium">Akun demo (Password123!):</p>
          <p>patient1 · doctor1 · admin1 · auditor1</p>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/" className="text-primary-600 hover:underline">Kembali ke beranda</Link>
        </p>
      </Card>
    </div>
  );
}
