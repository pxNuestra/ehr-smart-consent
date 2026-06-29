import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '../components/ui';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <ShieldX className="text-red-500" size={64} />
      <h1 className="mt-4 text-3xl font-bold text-slate-900">403 Dilarang</h1>
      <p className="mt-2 text-slate-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      <Link to="/" className="mt-6"><Button>Ke Beranda</Button></Link>
    </div>
  );
}
