import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { patients, type Patient } from '../api';
import { Spinner } from '../ui';
import { DevicesSection } from './patient/Devices';
import { MedicationsSection } from './patient/Medications';
import { MemoriesSection } from './patient/Memories';
import { PeopleSection } from './patient/People';
import { RoutineSection } from './patient/Routine';

const TABS = ['Overview', 'People', 'Memories', 'Medications', 'Routine'] as const;
type Tab = (typeof TABS)[number];

export function PatientDetail() {
  const { id } = useParams();
  const patientId = Number(id);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    patients.get(patientId).then(setPatient);
  }, [patientId]);

  if (!patient) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-1 text-2xl font-semibold text-slate-900">{patient.full_name}</div>
      <div className="mb-5 text-sm text-slate-500">
        {patient.home_label ?? 'No home set'} · {patient.my_access} access
      </div>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-4">
          <DevicesSection patientId={patientId} />
        </div>
      )}
      {tab === 'People' && <PeopleSection patientId={patientId} />}
      {tab === 'Memories' && <MemoriesSection patientId={patientId} />}
      {tab === 'Medications' && <MedicationsSection patientId={patientId} />}
      {tab === 'Routine' && <RoutineSection patientId={patientId} />}
    </div>
  );
}
