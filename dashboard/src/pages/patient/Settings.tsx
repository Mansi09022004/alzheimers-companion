import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { emergency, patients, type Contact } from '../../api';
import { useAuth } from '../../auth';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader, SectionTitle } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { BellIcon, SwapIcon } from '../../components/ui/icons';
import { PATIENT_APP_URL } from '../../config';
import { useCurrentPatient } from '../../lib/PatientContext';

export function Settings() {
  const { user } = useAuth();
  const { patient, reload } = useCurrentPatient();
  const toast = useToast();
  const nav = useNavigate();
  const [confirmUi, confirm] = useConfirm();

  const [form, setForm] = useState({ full_name: '', date_of_birth: '', notes: '', home_label: '', home_lat: '', home_lng: '', timezone: '' });
  const [savingPatient, setSavingPatient] = useState(false);

  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relation: '', priority: '5' });

  const [deviceLabel, setDeviceLabel] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setForm({
      full_name: patient.full_name,
      date_of_birth: patient.date_of_birth ?? '',
      notes: patient.notes ?? '',
      home_label: patient.home_label ?? '',
      home_lat: patient.home_lat != null ? String(patient.home_lat) : '',
      home_lng: patient.home_lng != null ? String(patient.home_lng) : '',
      timezone: patient.timezone ?? '',
    });
  }, [patient]);

  useEffect(() => {
    if (patient) emergency.list(patient.id).then(setContacts).catch(() => setContacts([]));
  }, [patient]);

  const savePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSavingPatient(true);
    try {
      await patients.update(patient.id, {
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        notes: form.notes || null,
        home_label: form.home_label || null,
        home_lat: form.home_lat ? Number(form.home_lat) : null,
        home_lng: form.home_lng ? Number(form.home_lng) : null,
        timezone: form.timezone || undefined,
      });
      toast.success('Patient details updated.');
      reload();
    } catch {
      toast.error('Could not save those details.');
    } finally {
      setSavingPatient(false);
    }
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    await emergency.create(patient.id, {
      name: contactForm.name,
      phone: contactForm.phone,
      relation: contactForm.relation || null,
      priority: Number(contactForm.priority),
    });
    toast.success(`${contactForm.name} added as an emergency contact.`);
    setContactForm({ name: '', phone: '', relation: '', priority: '5' });
    setAddingContact(false);
    emergency.list(patient.id).then(setContacts);
  };

  const removeContact = async (c: Contact) => {
    if (!(await confirm({ title: `Remove ${c.name}?`, confirmLabel: 'Remove' }))) return;
    await emergency.remove(c.id);
    toast.success('Contact removed.');
    if (patient) emergency.list(patient.id).then(setContacts);
  };

  const generateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setPairingBusy(true);
    try {
      const res = await patients.createDevice(patient.id, deviceLabel || "Patient's phone");
      setPairingCode(res.pairing_code);
    } catch {
      toast.error('Could not generate a pairing code.');
    } finally {
      setPairingBusy(false);
    }
  };

  const deletePatient = async () => {
    if (!patient) return;
    const ok = await confirm({
      title: `Permanently delete ${patient.full_name}?`,
      description: 'This removes the patient profile, memories, people, medications, location history, and alerts. This cannot be undone.',
      confirmLabel: 'Delete patient',
      tone: 'danger',
    });
    if (!ok) return;
    await patients.remove(patient.id);
    toast.success(`${patient.full_name} deleted.`);
    nav('/patients');
  };

  if (!patient) return null;

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader title="Settings" subtitle="Caregiver account, patient configuration, and data management." />

      <Card>
        <SectionTitle>Caregiver account</SectionTitle>
        <div className="flex items-center gap-3">
          <Avatar name={user?.full_name ?? '?'} size="md" />
          <div>
            <p className="font-medium text-slate-900">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle subtitle="This device is set up for the caregiver experience. Switching opens the patient app's role picker in a new tab.">
          Switch role
        </SectionTitle>
        <a
          href={`${PATIENT_APP_URL}/?switchRole=1`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-100"
        >
          <SwapIcon width={16} height={16} />
          Switch to Patient app
        </a>
      </Card>

      <Card>
        <SectionTitle subtitle="Name, notes, home location, and time zone used for scheduling.">Patient configuration</SectionTitle>
        <form onSubmit={savePatient} className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
          <Field label="Time zone" hint="IANA name, e.g. Asia/Kolkata">
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Kolkata" />
          </Field>
          <Field label="Home label">
            <Input value={form.home_label} onChange={(e) => setForm({ ...form, home_label: e.target.value })} placeholder="Home" />
          </Field>
          <Field label="Home latitude">
            <Input value={form.home_lat} onChange={(e) => setForm({ ...form, home_lat: e.target.value })} />
          </Field>
          <Field label="Home longitude">
            <Input value={form.home_lng} onChange={(e) => setForm({ ...form, home_lng: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={savingPatient}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card tone="coral">
        <SectionTitle action={<Button size="sm" onClick={() => setAddingContact((a) => !a)}>+ Add contact</Button>}>Emergency contacts</SectionTitle>
        {addingContact && (
          <form onSubmit={addContact} className="mb-4 grid gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} required />
            </Field>
            <Field label="Relation">
              <Input value={contactForm.relation} onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })} placeholder="son, doctor…" />
            </Field>
            <Field label="Priority (1 = called first)">
              <Input type="number" value={contactForm.priority} onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                Add contact
              </Button>
            </div>
          </form>
        )}
        {!contacts && <SkeletonRows count={2} height="h-12" />}
        {contacts?.length === 0 && !addingContact && <p className="text-sm text-slate-400">No emergency contacts added.</p>}
        <div className="space-y-2">
          {contacts?.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/70 bg-white/50 px-3.5 py-2.5">
              <div>
                <span className="font-medium text-slate-900">{c.name}</span> <Badge tone="slate">#{c.priority}</Badge>
                <p className="text-xs text-slate-500">
                  {c.phone}
                  {c.relation ? ` · ${c.relation}` : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeContact(c)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card tone="brand">
        <SectionTitle subtitle="Generate a one-time code and enter it in the patient app to link this device.">Patient device pairing</SectionTitle>
        <form onSubmit={generateCode} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Field label="Device name">
              <Input value={deviceLabel} onChange={(e) => setDeviceLabel(e.target.value)} placeholder="Dad's phone" />
            </Field>
          </div>
          <Button type="submit" loading={pairingBusy}>
            Generate code
          </Button>
        </form>
        {pairingCode && (
          <div className="mt-4 rounded-lg bg-brand-50 p-4 text-center">
            <div className="text-xs text-slate-500">Pairing code (valid ~15 minutes)</div>
            <div className="mt-1 font-mono text-3xl tracking-[0.3em] text-brand-700">{pairingCode}</div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Notifications</SectionTitle>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-4 text-slate-500">
          <BellIcon width={18} height={18} className="flex-none text-slate-300" />
          <p className="text-sm">Email/SMS notification preferences aren't available yet — coming soon.</p>
        </div>
      </Card>

      <Card className="border-danger-100">
        <SectionTitle>Privacy &amp; data management</SectionTitle>
        <p className="mb-3 text-sm text-slate-500">
          Deleting this patient permanently removes their profile, memories, people, face data, medications, location history, and alerts.
        </p>
        <Button variant="danger" onClick={deletePatient}>
          Delete patient
        </Button>
      </Card>
    </div>
  );
}
