import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <FileQuestion className="text-slate-400" size={64} />
      <h1 className="mt-4 text-3xl font-bold text-slate-900">404 Tidak Ditemukan</h1>
      <p className="mt-2 text-slate-600">Halaman yang Anda cari tidak ditemukan.</p>
      <Link to="/" className="mt-6"><Button>Ke Beranda</Button></Link>
    </div>
  );
}
