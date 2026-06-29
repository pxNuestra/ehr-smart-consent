import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="lg:hidden">
        <p className="text-sm font-bold text-primary-800">EHR Smart Consent</p>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <User size={16} />
          </div>
          <div className="hidden sm:block">
            <p className="font-medium text-slate-900">{user?.username}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
