import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { patients } from '../api';
import { PatientCard } from '../components/patient/PatientCard';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Input';
import { SkeletonRows } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { UsersIcon } from '../components/ui/icons';
import { usePatients } from '../lib/usePatients';

export function PatientsList() {
  const { list, error, reload } = usePatients();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  const [name, setName] = useState('');
  const [homeLabel, setHomeLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  const closeModal = () => {
    setOpen(false);
    if (params.get('new')) setParams({}, { replace: true });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await patients.create({ full_name: name, home_label: homeLabel || null });
      toast.success(`${p.full_name} added.`);
      setName('');
      setHomeLabel('');
      closeModal();
      reload();
      nav(`/patients/${p.id}/dashboard`);
    } catch {
      toast.error('Could not create the patient.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Everyone you're a caregiver for."
        action={<Button onClick={() => setOpen(true)}>+ Add patient</Button>}
      />

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}
      {!list && !error && <SkeletonRows count={3} />}

      {list && list.length === 0 && (
        <EmptyState
          icon={<UsersIcon />}
          title="No patients yet"
          description="Add the person you're caring for to start registering family, memories, medicines and safe zones."
          action={<Button onClick={() => setOpen(true)}>+ Add your first patient</Button>}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {list?.map((p) => (
          <PatientCard key={p.id} patient={p} />
        ))}
      </div>

      <Modal open={open} onClose={closeModal} title="Add a patient" width="sm">
        <form onSubmit={create} className="space-y-3">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
          <Field label="Home label" hint="e.g. Green Villa — shown around the app and used as the default safe-zone centre later.">
            <Input value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} placeholder="Green Villa" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
