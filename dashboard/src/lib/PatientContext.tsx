import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { patients, type Patient } from '../api';

type Ctx = { patient: Patient | null; loading: boolean; error: string | null; reload: () => void };

const PatientCtx = createContext<Ctx | null>(null);

/** Loads the patient named by the `:id` route param once and shares it with every
 * nested page (Dashboard/People/Memories/...) so they don't each re-fetch it. */
export function PatientProvider({ patientId, children }: { patientId: number; children: ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    patients
      .get(patientId)
      .then(setPatient)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this patient.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return <PatientCtx.Provider value={{ patient, loading, error, reload }}>{children}</PatientCtx.Provider>;
}

export function useCurrentPatient(): Ctx {
  const ctx = useContext(PatientCtx);
  if (!ctx) throw new Error('useCurrentPatient outside PatientProvider');
  return ctx;
}
