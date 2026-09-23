import { useRef, useState } from 'react';

import { Avatar } from './Avatar';
import { CameraIcon } from './icons';

const SIZE_PX = { sm: 44, md: 64, lg: 96 };
const BADGE_PX = { sm: 20, md: 26, lg: 34 };

/** An Avatar with a camera-icon affordance for uploading a profile photo. */
export function AvatarUpload({
  name,
  photoUrl,
  size = 'lg',
  onUpload,
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZE_PX;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex-none" style={{ width: SIZE_PX[size], height: SIZE_PX[size] }}>
      <Avatar name={name} size={size} photoUrl={photoUrl} />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        aria-label="Upload photo"
        style={{ width: BADGE_PX[size], height: BADGE_PX[size] }}
        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-soft hover:bg-brand-700 disabled:opacity-60"
      >
        <CameraIcon width={BADGE_PX[size] * 0.5} height={BADGE_PX[size] * 0.5} />
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onChange} />
    </div>
  );
}
