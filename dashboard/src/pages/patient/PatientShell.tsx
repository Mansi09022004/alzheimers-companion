import { Outlet, useParams } from 'react-router-dom';

import { ErrorState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/LoadingState';
import { PatientProvider, useCurrentPatient } from '../../lib/PatientContext';

function Inner() {
  const { patient, loading, error, reload } = useCurrentPatient();

  if (loading) return <PageSpinner />;
  if (error || !patient) return <ErrorState message={error ?? 'Patient not found.'} onRetry={reload} />;

  return <Outlet />;
}

/** Wraps every /patients/:id/* page with the shared patient data. */
export function PatientShell() {
  const { id } = useParams();
  return (
    <PatientProvider patientId={Number(id)}>
      <Inner />
    </PatientProvider>
  );
}
