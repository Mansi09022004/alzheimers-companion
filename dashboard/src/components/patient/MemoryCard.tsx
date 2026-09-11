import type { Memory, Person } from '../../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SparklesIcon, TrashIcon } from '../ui/icons';

const STATUS_TONE = { approved: 'green', pending: 'amber', rejected: 'red' } as const;

export function MemoryCard({
  memory,
  person,
  onApprove,
  onReject,
  onDelete,
}: {
  memory: Memory;
  person?: Person;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  const isSuggestion = memory.source === 'ai_suggestion';

  return (
    <div className={`rounded-lg border p-4 ${isSuggestion && memory.status === 'pending' ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[memory.status]}>{memory.status}</Badge>
            {isSuggestion && (
              <Badge tone="blue">
                <span className="inline-flex items-center gap-1">
                  <SparklesIcon width={11} height={11} /> AI suggestion
                </span>
              </Badge>
            )}
            {person && <Badge>{person.display_name}</Badge>}
            {memory.memory_date && <span className="text-xs text-slate-400">{memory.memory_date}</span>}
          </div>
          <p className="text-sm leading-relaxed text-slate-800">{memory.text}</p>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(memory.id)}
            className="flex-none rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-danger-500"
            aria-label="Delete memory"
          >
            <TrashIcon width={16} height={16} />
          </button>
        )}
      </div>

      {memory.status === 'pending' && (onApprove || onReject) && (
        <div className="mt-3 flex gap-2">
          {onApprove && (
            <Button size="sm" onClick={() => onApprove(memory.id)}>
              Approve
            </Button>
          )}
          {onReject && (
            <Button size="sm" variant="ghost" onClick={() => onReject(memory.id)}>
              Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
