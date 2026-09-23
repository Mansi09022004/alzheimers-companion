import { useParams } from 'react-router-dom';

import { AppShell } from '../../components/layout/AppShell';
import { ErrorState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/LoadingState';
import { PatientProvider, useCurrentPatient } from '../../lib/PatientContext';

function Inner() {
  const { patient, loading, error, reload } = useCurrentPatient();

  if (loading) return <PageSpinner />;
  if (error || !patient) return <ErrorState message={error ?? 'Patient not found.'} onRetry={reload} />;

  return <AppShell />;
}

/** Loads the loved one named by `:id` and provides them to the whole shell —
 * sidebar identity, header alerts, and every nested page (Overview/People/...). */
export function PatientShell() {
  const { id } = useParams();
  return (
    <PatientProvider patientId={Number(id)}>
      <Inner />
    </PatientProvider>
  );
}
