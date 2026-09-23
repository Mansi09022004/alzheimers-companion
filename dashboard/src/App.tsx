import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from './auth';
import { ToastProvider } from './components/ui/Toast';
import { PageSpinner } from './components/ui/LoadingState';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Alerts } from './pages/patient/Alerts';
import { Location } from './pages/patient/Location';
import { MedicationPage } from './pages/patient/Medication';
import { Memories } from './pages/patient/Memories';
import { Overview } from './pages/patient/Overview';
import { PatientShell } from './pages/patient/PatientShell';
import { People } from './pages/patient/People';
import { Settings } from './pages/patient/Settings';

function Protected() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <Outlet />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/patients" replace /> : <Login />} />
        <Route element={<Protected />}>
          <Route path="/patients" element={<Home />} />
          <Route path="/patients/:id" element={<PatientShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Overview />} />
            <Route path="people" element={<People />} />
            <Route path="memories" element={<Memories />} />
            <Route path="medication" element={<MedicationPage />} />
            <Route path="location" element={<Location />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/patients" replace />} />
      </Routes>
    </ToastProvider>
  );
}
