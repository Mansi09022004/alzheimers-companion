import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { memories, people, type Memory, type Person } from '../../api';
import { MemoryCard } from '../../components/patient/MemoryCard';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { MemoryIcon, SearchIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

export function Memories() {
  const { patient } = useCurrentPatient();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [params, setParams] = useSearchParams();

  const [list, setList] = useState<Memory[] | null>(null);
  const [ppl, setPpl] = useState<Person[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(params.get('add') === '1');
  const [editing, setEditing] = useState<Memory | null>(null);
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState('');
  const [memDate, setMemDate] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!patient) return;
    memories.list(patient.id, filter === 'all' ? undefined : filter).then(setList).catch(() => setList([]));
  };
  useEffect(load, [patient, filter]);
  useEffect(() => {
    if (patient) people.list(patient.id).then(setPpl);
  }, [patient]);

  const closeAdd = () => {
    setAddOpen(false);
    if (params.get('add')) setParams({}, { replace: true });
  };

  const openAdd = () => {
    setEditing(null);
    setText('');
    setPersonId('');
    setMemDate('');
    setAddOpen(true);
  };
  const openEdit = (m: Memory) => {
    setEditing(m);
    setText(m.text);
    setPersonId(m.person_id ? String(m.person_id) : '');
    setMemDate(m.memory_date ?? '');
    setAddOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setBusy(true);
    try {
      if (editing) {
        await memories.update(editing.id, { text, person_id: personId ? Number(personId) : null, memory_date: memDate || null });
        toast.success('Memory updated.');
      } else {
        await memories.create(patient.id, { text, person_id: personId ? Number(personId) : null, memory_date: memDate || null });
        toast.success('Memory added and approved.');
      }
      closeAdd();
      load();
    } catch {
      toast.error('Could not save the memory.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async (id: number) => {
    await memories.review(id, 'approved');
    toast.success('Memory approved.');
    load();
  };
  const reject = async (id: number) => {
    await memories.review(id, 'rejected');
    toast.info('Memory rejected.');
    load();
  };
  const remove = async (id: number) => {
    if (!(await confirm({ title: 'Delete this memory?', confirmLabel: 'Delete' }))) return;
    await memories.remove(id);
    toast.success('Memory deleted.');
    load();
  };

  const filtered = useMemo(() => {
    if (!list) return null;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((m) => m.text.toLowerCase().includes(q));
  }, [list, search]);

  const personOf = (id: number | null) => (id ? ppl.find((p) => p.id === id) : undefined);

  if (!patient) return null;

  return (
    <div>
      {confirmUi}
      <PageHeader
        title="Memories"
        subtitle="What the assistant is allowed to tell the patient — only approved memories are used."
        action={<Button onClick={openAdd}>+ Add memory</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories…" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'approved', 'rejected'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!filtered && <SkeletonRows count={3} height="h-20" />}
      {filtered?.length === 0 && (
        <EmptyState
          icon={<MemoryIcon />}
          title={search ? 'No memories match your search' : 'No memories here yet'}
          description={!search ? 'Tap "+ Add memory" to add the first one.' : undefined}
        />
      )}

      <div className="space-y-2.5">
        {filtered?.map((m) => (
          <div key={m.id}>
            <MemoryCard memory={m} person={personOf(m.person_id)} onApprove={approve} onReject={reject} onDelete={remove} onEdit={openEdit} />
          </div>
        ))}
      </div>

      <Modal open={addOpen} onClose={closeAdd} title={editing ? 'Edit memory' : 'Add a memory'} width="sm">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Memory">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} required placeholder="Rahul visited on Sunday and brought mangoes." />
          </Field>
          <Field label="Linked person (optional)">
            <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">—</option>
              {ppl.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date (optional)">
            <Input type="date" value={memDate} onChange={(e) => setMemDate(e.target.value)} />
          </Field>
          {!editing && <p className="text-xs text-slate-400">Caregiver memories are approved immediately.</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeAdd}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
