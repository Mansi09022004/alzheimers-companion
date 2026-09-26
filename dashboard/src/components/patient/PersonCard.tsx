import { useEffect, useState } from 'react';

import { faces, people as peopleApi, type Consent, type FaceEmbedding, type Person } from '../../api';
import { AvatarUpload } from '../ui/AvatarUpload';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CameraIcon, CheckIcon, EditIcon, TrashIcon } from '../ui/icons';

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function PersonCard({
  person,
  lastMentionedAt,
  onRegisterFace,
  onEdit,
  onRemove,
  onPhotoUploaded,
  refreshKey = 0,
}: {
  person: Person;
  lastMentionedAt?: string | null;
  refreshKey?: number;
  onRegisterFace: (person: Person, hasConsent: boolean) => void;
  onEdit: (person: Person) => void;
  onRemove: (person: Person) => void;
  onPhotoUploaded?: () => void;
}) {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [faceList, setFaceList] = useState<FaceEmbedding[] | undefined>(undefined);

  useEffect(() => {
    faces.list(person.id).then(setFaceList).catch(() => setFaceList([]));
    faces.getConsent(person.id).then(setConsent).catch(() => setConsent(null));
  }, [person.id, refreshKey]);

  const registered = (faceList?.length ?? 0) > 0;
  const hasConsent = !!consent;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-peach-200/70 bg-gradient-to-b from-peach-50 to-white p-5 shadow-card">
      <div className="absolute right-2.5 top-2.5 flex gap-0.5">
        <button
          onClick={() => onEdit(person)}
          className="rounded-md p-1.5 text-ink-300 hover:bg-white/70 hover:text-ink-600"
          aria-label={`Edit ${person.display_name}`}
        >
          <EditIcon width={15} height={15} />
        </button>
        <button
          onClick={() => onRemove(person)}
          className="rounded-md p-1.5 text-ink-300 hover:bg-white/70 hover:text-danger-500"
          aria-label={`Remove ${person.display_name}`}
        >
          <TrashIcon width={15} height={15} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <AvatarUpload
          name={person.display_name}
          photoUrl={person.photo_url}
          size="lg"
          onUpload={async (file) => {
            await peopleApi.uploadPhoto(person.id, file);
            onPhotoUploaded?.();
          }}
        />
        <p className="mt-3 font-display text-base font-semibold text-ink-900">{person.display_name}</p>
        <Badge tone="blue">{person.relationship_label}</Badge>
        {person.short_bio && <p className="mt-2 text-sm leading-relaxed text-ink-500">{person.short_bio}</p>}
        {lastMentionedAt && (
          <p className="mt-1.5 text-xs text-ink-400">Last mentioned {timeAgo(lastMentionedAt)}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        <Badge tone={consent === undefined ? 'slate' : hasConsent ? 'green' : 'slate'}>
          {consent === undefined ? '…' : hasConsent ? 'Consent granted' : 'No consent'}
        </Badge>
        {faceList === undefined ? (
          <Badge tone="slate">…</Badge>
        ) : registered ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
            <CheckIcon width={11} height={11} /> Face registered ({faceList.length})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700">
            Face not registered
          </span>
        )}
      </div>

      <div className="mt-3.5">
        <Button
          size="sm"
          variant={registered ? 'ghost' : 'primary'}
          className="w-full justify-center"
          onClick={() => onRegisterFace(person, hasConsent)}
        >
          <CameraIcon width={14} height={14} />
          {registered ? 'Manage photos' : 'Register face'}
        </Button>
      </div>
    </div>
  );
}
