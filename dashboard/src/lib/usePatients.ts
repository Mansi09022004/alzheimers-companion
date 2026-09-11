import { useCallback, useEffect, useState } from 'react';

import { patients, type Patient } from '../api';

/** Shared "list of my patients" — used by the sidebar switcher and the Patients page. */
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
