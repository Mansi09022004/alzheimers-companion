import { useEffect, useState } from 'react';

import { memories, people, type Memory, type Person } from '../../api';
import { Badge, Button, Card, Field, SectionTitle, Spinner, Textarea } from '../../ui';

const STATUS_TONE = { approved: 'green', pending: 'amber', rejected: 'red' } as const;

export function MemoriesSection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<Memory[] | null>(null);
  const [ppl, setPpl] = useState<Person[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState<string>('');

  const load = () =>
    memories.list(patientId, filter === 'all' ? undefined : filter).then(setList);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, filter]);
  useEffect(() => {
    people.list(patientId).then(setPpl);
  }, [patientId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await memories.create(patientId, {
      text,
      person_id: personId ? Number(personId) : null,
    });
    setText('');
    setPersonId('');
    load();
  };

  const review = async (id: number, decision: 'approved' | 'rejected') => {
    await memories.review(id, decision);
    load();
  };

  return (
    <div>
      <SectionTitle>Memories</SectionTitle>

      <Card className="mb-4">
        <form onSubmit={add} className="space-y-3">
          <Field label="New memory">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Rahul visited on Sunday and brought mangoes."
              required
            />
          </Field>
          <div className="flex items-end gap-3">
            <Field label="About (optional)">
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {ppl.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit">Add memory</Button>
            <span className="pb-2 text-xs text-slate-400">Caregiver memories are approved immediately.</span>
          </div>
        </form>
      </Card>

      <div className="mb-3 flex gap-1.5">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!list ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {list.length === 0 && <p className="text-sm text-slate-500">Nothing here.</p>}
          {list.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-800">{m.text}</p>
                <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span>{m.source === 'ai_suggestion' ? 'AI-suggested' : 'Caregiver'}</span>
                {m.memory_date && <span>· {m.memory_date}</span>}
                <span className="flex-1" />
                {m.status !== 'approved' && (
                  <Button variant="ghost" onClick={() => review(m.id, 'approved')}>
                    Approve
                  </Button>
                )}
                {m.status !== 'rejected' && (
                  <Button variant="ghost" onClick={() => review(m.id, 'rejected')}>
                    Reject
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
