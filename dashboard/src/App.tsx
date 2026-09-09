import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from './auth';
import { Login } from './pages/Login';
import { PatientDetail } from './pages/PatientDetail';
import { Patients } from './pages/Patients';
import { Button, Spinner } from './ui';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/patients" className="font-semibold text-slate-900">
            Alzheimer's Companion
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{user?.full_name}</span>
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/patients" replace /> : <Login />} />
      <Route
        path="/patients"
        element={
          <Protected>
            <Patients />
          </Protected>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <Protected>
            <PatientDetail />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
