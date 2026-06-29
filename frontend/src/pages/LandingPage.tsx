import { Link } from 'react-router-dom';
import { Shield, Fingerprint, Link2, Stethoscope, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="border-b border-primary-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="text-primary-600" size={32} />
            <span className="text-xl font-bold text-primary-800">Hibah</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login"><Button variant="outline">Masuk</Button></Link>
            <Link to="/register"><Button>Mulai</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Kontrol Akses Berbasis Pasien untuk{' '}
          <span className="text-primary-600">Rekam Medis Elektronik</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Pasien bisa memberi, membatasi, dan mencabut persetujuan akses. Dokter hanya bisa membuka RME dengan sidik jari valid dan consent aktif yang diverifikasi blockchain. Data klinis tetap terenkripsi off-chain.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/login"><Button className="gap-2 px-6 py-3">Masuk Portal <ArrowRight size={18} /></Button></Link>
          <Link to="/register"><Button variant="outline" className="px-6 py-3">Setup Admin</Button></Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 md:grid-cols-3">
        {[
          { icon: <Shield className="text-primary-600" size={32} />, title: 'Persetujuan Akses', desc: 'Pasien mengatur siapa yang bisa akses data, untuk tujuan apa, dan sampai kapan.' },
          { icon: <Fingerprint className="text-secondary-600" size={32} />, title: 'Verifikasi Biometrik', desc: 'Dokter wajib verifikasi sidik jari sebelum membuka rekam medis.' },
          { icon: <Link2 className="text-primary-600" size={32} />, title: 'Jejak Audit Blockchain', desc: 'Consent dan log akses dicatat on-chain memakai hash integritas.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">{f.icon}</div>
            <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} Hibah. Hak cipta dilindungi.
      </footer>
    </div>
  );
}
