import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

import PatientDashboard from './pages/patient/PatientDashboard';
import ConsentManagement from './pages/patient/ConsentManagement';
import AccessHistory from './pages/patient/AccessHistory';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import RequestAccess from './pages/doctor/RequestAccess';
import EhrViewer from './pages/doctor/EhrViewer';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import RoleManagement from './pages/admin/RoleManagement';
import SystemConfig from './pages/admin/SystemConfig';

import AuditorDashboard from './pages/auditor/AuditorDashboard';
import AuditLogs from './pages/auditor/AuditLogs';
import TransactionDetail from './pages/auditor/TransactionDetail';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LandingPage />;
  const routes: Record<string, string> = {
    PATIENT: '/patient/dashboard',
    DOCTOR: '/doctor/dashboard',
    ADMIN: '/admin/dashboard',
    AUDITOR: '/auditor/dashboard',
  };
  return <Navigate to={routes[user.role]} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route path="/403" element={<ForbiddenPage />} />

            <Route element={<ProtectedRoute roles={['PATIENT']} />}>
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/consents" element={<ConsentManagement />} />
              <Route path="/patient/access-history" element={<AccessHistory />} />
            </Route>

            <Route element={<ProtectedRoute roles={['DOCTOR']} />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/request-access" element={<RequestAccess />} />
              <Route path="/doctor/ehr-viewer" element={<EhrViewer />} />
            </Route>

            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/roles" element={<RoleManagement />} />
              <Route path="/admin/config" element={<SystemConfig />} />
            </Route>

            <Route element={<ProtectedRoute roles={['AUDITOR']} />}>
              <Route path="/auditor/dashboard" element={<AuditorDashboard />} />
              <Route path="/auditor/logs" element={<AuditLogs />} />
              <Route path="/auditor/transactions" element={<TransactionDetail />} />
              <Route path="/auditor/transactions/:txHash" element={<TransactionDetail />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
