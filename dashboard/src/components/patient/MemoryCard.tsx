import type { Memory, Person } from '../../api';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CheckIcon, EditIcon, SparklesIcon, TrashIcon, XIcon } from '../ui/icons';

const STATUS_TONE = { approved: 'green', pending: 'amber', rejected: 'red' } as const;

type Category = 'Family' | 'Interests' | 'Places' | 'Food' | 'Important events' | 'General';

const CATEGORY_STYLE: Record<Category, string> = {
  Family: 'bg-brand-100 text-brand-700',
  Interests: 'bg-gold-100 text-gold-600',
  Places: 'bg-sage-100 text-sage-700',
  Food: 'bg-peach-100 text-peach-600',
  'Important events': 'bg-blossom-100 text-blossom-600',
  General: 'bg-ink-100 text-ink-500',
};

const FOOD_WORDS = ['mango', 'food', 'ate', 'eat', 'cook', 'lunch', 'dinner', 'breakfast', 'sweet', 'tea', 'coffee', 'dish', 'meal', 'recipe', 'snack'];
const PLACE_WORDS = ['garden', 'park', 'temple', 'church', 'market', 'hospital', 'clinic', 'travel', 'trip', 'visited', 'walk', 'village', 'town', 'beach'];
const EVENT_WORDS = ['birthday', 'anniversary', 'wedding', 'festival', 'diwali', 'holi', 'celebrat', 'appointment', 'surgery', 'graduat'];
const INTEREST_WORDS = ['loves', 'likes', 'enjoys', 'favourite', 'favorite', 'hobby', 'music', 'song', 'sing', 'read', 'book', 'tv', 'movie', 'garden'];

/** A light, honest heuristic for grouping memories at a glance — not a stored
 * field, just a read of the memory's own text (and whether it's linked to a
 * person), so nothing is fabricated. */
function categorize(memory: Memory, person?: Person): Category {
  const t = memory.text.toLowerCase();
  if (EVENT_WORDS.some((w) => t.includes(w))) return 'Important events';
  if (FOOD_WORDS.some((w) => t.includes(w))) return 'Food';
  if (PLACE_WORDS.some((w) => t.includes(w))) return 'Places';
  if (INTEREST_WORDS.some((w) => t.includes(w))) return 'Interests';
  if (person) return 'Family';
  return 'General';
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MemoryCard({
  memory,
  person,
  onApprove,
  onReject,
  onDelete,
  onEdit,
}: {
  memory: Memory;
  person?: Person;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (memory: Memory) => void;
}) {
  const isSuggestion = memory.source === 'ai_suggestion';
  const isPending = memory.status === 'pending';
  const category = categorize(memory, person);

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isPending
          ? 'border-gold-300 bg-gradient-to-br from-gold-100 to-gold-50 shadow-card'
          : memory.status === 'rejected'
            ? 'border-slate-200 bg-slate-50'
            : 'border-lavender-200 bg-gradient-to-br from-lavender-100 to-lavender-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[memory.status]}>{memory.status}</Badge>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLE[category]}`}>{category}</span>
            {isSuggestion && (
              <Badge tone="blue">
                <span className="inline-flex items-center gap-1">
                  <SparklesIcon width={11} height={11} /> AI suggestion
                </span>
              </Badge>
            )}
            <span className="text-xs text-ink-400">
              {memory.memory_date ? new Date(memory.memory_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : `Added ${timeAgo(memory.created_at)}`}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-800">{memory.text}</p>
          {person && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <Avatar name={person.display_name} photoUrl={person.photo_url} size="sm" />
              <span className="text-xs font-medium text-ink-600">{person.display_name}</span>
              <span className="text-xs text-ink-400">· {person.relationship_label}</span>
            </div>
          )}
        </div>
        <div className="flex flex-none items-center gap-0.5">
          {onEdit && (
            <button
              onClick={() => onEdit(memory)}
              className="rounded-md p-1.5 text-ink-300 hover:bg-white/70 hover:text-ink-600"
              aria-label="Edit memory"
            >
              <EditIcon width={16} height={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(memory.id)}
              className="rounded-md p-1.5 text-ink-300 hover:bg-white/70 hover:text-danger-500"
              aria-label="Delete memory"
            >
              <TrashIcon width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {isPending && (onApprove || onReject) && (
        <div className="mt-3.5 flex items-center gap-2 border-t border-gold-200/70 pt-3.5">
          <span className="text-xs font-semibold text-gold-700">Waiting for your review —</span>
          {onApprove && (
            <Button size="sm" onClick={() => onApprove(memory.id)}>
              <CheckIcon width={14} height={14} /> Approve
            </Button>
          )}
          {onReject && (
            <Button size="sm" variant="ghost" onClick={() => onReject(memory.id)}>
              <XIcon width={14} height={14} /> Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
