import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { memories as memoriesApi, people, relationships as relApi, type Memory, type Person, type PersonRelationship, type RelationshipType } from '../../api';
import { FaceRegistrationModal } from '../../components/patient/FaceRegistrationModal';
import { PersonCard } from '../../components/patient/PersonCard';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { PageHeader, SectionTitle } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { ArrowRightIcon, TrashIcon, UsersIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';

const REL_TYPES: RelationshipType[] = ['parent', 'child', 'spouse', 'sibling', 'grandparent', 'grandchild', 'friend', 'other'];

export function People() {
  const { patient } = useCurrentPatient();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [params, setParams] = useSearchParams();

  const [list, setList] = useState<Person[] | null>(null);
  const [rels, setRels] = useState<PersonRelationship[] | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  const [formOpen, setFormOpen] = useState(params.get('add') === '1');
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState({ display_name: '', relationship_label: '', short_bio: '' });
  const [busy, setBusy] = useState(false);

  const [faceModal, setFaceModal] = useState<{ person: Person; hasConsent: boolean } | null>(null);
  const [faceRefresh, setFaceRefresh] = useState(0);
  const [relOpen, setRelOpen] = useState(false);
  const [relForm, setRelForm] = useState({ from: '', to: '', type: 'spouse' as RelationshipType, note: '' });

  const load = () => {
    if (!patient) return;
    people.list(patient.id).then(setList).catch(() => setList([]));
    relApi.list(patient.id).then(setRels).catch(() => setRels([]));
    memoriesApi.list(patient.id, 'approved').then(setMemories).catch(() => setMemories([]));
  };
  useEffect(load, [patient]);

  const lastMentionFor = (personId: number): string | null => {
    const mentions = memories
      .filter((m) => m.person_id === personId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return mentions[0]?.created_at ?? null;
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ display_name: '', relationship_label: '', short_bio: '' });
    setFormOpen(true);
  };
  const openEdit = (p: Person) => {
    setEditing(p);
    setForm({ display_name: p.display_name, relationship_label: p.relationship_label, short_bio: p.short_bio ?? '' });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    if (params.get('add')) setParams({}, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setBusy(true);
    try {
      if (editing) {
        await people.update(editing.id, form);
        toast.success('Updated.');
      } else {
        await people.create(patient.id, form);
        toast.success(`${form.display_name} added.`);
      }
      closeForm();
      load();
    } catch {
      toast.error('Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Person) => {
    if (!(await confirm({ title: `Remove ${p.display_name}?`, description: 'This also deletes their registered face and any memories that mention them.', confirmLabel: 'Remove' }))) return;
    await people.remove(p.id);
    toast.success(`${p.display_name} removed.`);
    load();
  };

  const addRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !relForm.from || !relForm.to) return;
    if (relForm.type === 'other' && !relForm.note.trim()) return;
    try {
      await relApi.create(patient.id, {
        from_person_id: Number(relForm.from),
        to_person_id: Number(relForm.to),
        relationship: relForm.type,
        note: relForm.type === 'other' ? relForm.note.trim() : undefined,
      });
      setRelOpen(false);
      setRelForm({ from: '', to: '', type: 'spouse', note: '' });
      toast.success('Relationship added.');
      load();
    } catch {
      toast.error('Could not add that relationship.');
    }
  };

  const personOf = (id: number) => list?.find((p) => p.id === id);
  const nameOf = (id: number) => personOf(id)?.display_name ?? `#${id}`;

  if (!patient) return null;

  return (
    <div>
      {confirmUi}
      <PageHeader title="People" subtitle="Family and friends the patient can recognise." action={<Button onClick={openAdd}>+ Add person</Button>} />

      {!list && <SkeletonRows count={3} height="h-24" />}
      {list?.length === 0 && (
        <EmptyState
          icon={<UsersIcon />}
          title="No one registered yet"
          description="Add a family member, then register their face so the patient app can recognise them."
          action={<Button onClick={openAdd}>+ Add the first person</Button>}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            lastMentionedAt={lastMentionFor(p.id)}
            onEdit={openEdit}
            onRemove={remove}
            onRegisterFace={(person, hasConsent) => setFaceModal({ person, hasConsent })}
            onPhotoUploaded={load}
            refreshKey={faceRefresh}
          />
        ))}
      </div>

      {list && list.length >= 2 && (
        <div className="mt-8">
          <SectionTitle
            subtitle="How registered people relate to each other — feeds the assistant's context."
            action={
              <Button size="sm" variant="ghost" onClick={() => setRelOpen(true)}>
                + Add relationship
              </Button>
            }
          >
            Family relationships
          </SectionTitle>
          {rels?.length === 0 && <p className="text-sm text-slate-400">No relationships added yet.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {rels?.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-peach-200/70 bg-gradient-to-r from-peach-50 to-white px-3.5 py-2.5 text-sm">
                <Avatar name={nameOf(r.from_person_id)} photoUrl={personOf(r.from_person_id)?.photo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-800">{nameOf(r.from_person_id)}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-400">
                    is the {r.relationship === 'other' && r.note ? r.note : r.relationship} of
                    <ArrowRightIcon width={10} height={10} />
                    <span className="font-medium text-ink-600">{nameOf(r.to_person_id)}</span>
                  </p>
                </div>
                <Avatar name={nameOf(r.to_person_id)} photoUrl={personOf(r.to_person_id)?.photo_url} size="sm" />
                <button
                  onClick={async () => {
                    await relApi.remove(r.id);
                    load();
                  }}
                  className="flex-none text-ink-300 hover:text-danger-500"
                  aria-label="Remove relationship"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={closeForm} title={editing ? `Edit ${editing.display_name}` : 'Add a person'} width="sm">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Relationship to patient">
            <Input
              value={form.relationship_label}
              onChange={(e) => setForm({ ...form, relationship_label: e.target.value })}
              placeholder="son, wife, neighbour…"
              required
            />
          </Field>
          <Field label="Short note (optional)">
            <Textarea rows={2} value={form.short_bio} onChange={(e) => setForm({ ...form, short_bio: e.target.value })} placeholder="Lives in Pune, visits on Sundays" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={relOpen} onClose={() => setRelOpen(false)} title="Add a relationship" width="sm">
        <form onSubmit={addRelationship} className="space-y-3">
          <Field label="Person">
            <Select value={relForm.from} onChange={(e) => setRelForm({ ...relForm, from: e.target.value })} required>
              <option value="">Choose…</option>
              {list?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Relationship type">
            <Select value={relForm.type} onChange={(e) => setRelForm({ ...relForm, type: e.target.value as RelationshipType })}>
              {REL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          {relForm.type === 'other' && (
            <Field label="Describe the relationship">
              <Input
                value={relForm.note}
                onChange={(e) => setRelForm({ ...relForm, note: e.target.value })}
                placeholder="family friend, neighbour, carer…"
                required
                autoFocus
              />
            </Field>
          )}
          <Field label="Of">
            <Select value={relForm.to} onChange={(e) => setRelForm({ ...relForm, to: e.target.value })} required>
              <option value="">Choose…</option>
              {list?.filter((p) => String(p.id) !== relForm.from).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setRelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      {faceModal && (
        <FaceRegistrationModal
          person={faceModal.person}
          hasConsent={faceModal.hasConsent}
          onClose={() => setFaceModal(null)}
          onDone={() => {
            setFaceRefresh((n) => n + 1);
            load();
          }}
        />
      )}
    </div>
  );
}
