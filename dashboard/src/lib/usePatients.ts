import { useCallback, useEffect, useState } from 'react';

import { patients, type Patient } from '../api';

/** The caregiver's patients — used by Home to pick the primary one (lowest id) and
 * to decide whether to show onboarding or jump straight to their dashboard. */
export function usePatients() {
  const [list, setList] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    patients.list().then(setList).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load patients.'));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { list, error, reload };
}
