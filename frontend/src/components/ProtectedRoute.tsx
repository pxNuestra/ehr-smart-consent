import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LoadingSkeleton } from './ui';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSkeleton rows={3} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col lg:ml-64">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const dash: Record<UserRole, string> = {
      PATIENT: '/patient/dashboard',
      DOCTOR: '/doctor/dashboard',
      ADMIN: '/admin/dashboard',
      AUDITOR: '/auditor/dashboard',
    };
    return <Navigate to={dash[user.role]} replace />;
  }
  return <Outlet />;
}
