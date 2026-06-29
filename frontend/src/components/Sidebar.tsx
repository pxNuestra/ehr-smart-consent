import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, History, Stethoscope, FileSearch,
  Eye, Users, Settings, ClipboardList, Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const menuByRole: Record<string, { to: string; label: string; icon: React.ReactNode }[]> = {
  PATIENT: [
    { to: '/patient/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/patient/consents', label: 'Manajemen Consent', icon: <Shield size={20} /> },
    { to: '/patient/access-history', label: 'Riwayat Akses', icon: <History size={20} /> },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/doctor/request-access', label: 'Minta Akses', icon: <FileSearch size={20} /> },
    { to: '/doctor/ehr-viewer', label: 'Lihat RME', icon: <Eye size={20} /> },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/admin/users', label: 'Manajemen User', icon: <Users size={20} /> },
    { to: '/admin/roles', label: 'Manajemen Peran', icon: <Shield size={20} /> },
    { to: '/admin/config', label: 'Konfigurasi Sistem', icon: <Settings size={20} /> },
  ],
  AUDITOR: [
    { to: '/auditor/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/auditor/logs', label: 'Log Audit', icon: <ClipboardList size={20} /> },
    { to: '/auditor/transactions', label: 'Transaksi', icon: <Activity size={20} /> },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;
  const items = menuByRole[user.role] || [];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <Stethoscope className="text-primary-600" size={28} />
          <div>
            <p className="text-sm font-bold text-primary-800">EHR Smart</p>
            <p className="text-xs text-slate-500">Sistem Consent</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white lg:hidden">
        {items.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center py-2 text-xs',
                isActive ? 'text-primary-600' : 'text-slate-500'
              )
            }
          >
            {item.icon}
            <span className="mt-1 truncate">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
