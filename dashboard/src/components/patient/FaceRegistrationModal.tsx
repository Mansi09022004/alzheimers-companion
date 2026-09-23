import { useEffect, useRef, useState } from 'react';

import { faces, type FaceEmbedding, type Person } from '../../api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useConfirm } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { CameraIcon, ShieldIcon, TrashIcon } from '../ui/icons';

type Step = 'consent' | 'manage' | 'upload';

/**
 * Consent-first face registration: grant consent -> upload one photo -> the vision
 * service turns it into an embedding (the photo itself is never stored).
 */
export function FaceRegistrationModal({
  person,
  hasConsent,
  onClose,
  onDone,
}: {
  person: Person;
  hasConsent: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>(hasConsent ? 'manage' : 'consent');
  const [purpose, setPurpose] = useState(`Face recognition to help the patient recognise ${person.display_name}.`);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceList, setFaceList] = useState<FaceEmbedding[] | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();

  const loadFaces = () => faces.list(person.id).then(setFaceList).catch(() => setFaceList([]));

  useEffect(() => {
    if (step === 'manage') loadFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const grantConsent = async () => {
    setBusy(true);
    setError(null);
    try {
      await faces.grantConsent(person.id, purpose);
      setStep('upload');
    } catch {
      setError('Could not record consent.');
    } finally {
      setBusy(false);
    }
  };

  const removeFace = async (faceId: number) => {
    if (!(await confirm({ title: 'Remove this registered photo?', description: "The patient app won't recognise this face anymore.", confirmLabel: 'Remove' }))) return;
    setRemovingId(faceId);
    try {
      await faces.remove(faceId);
      toast.success('Photo removed.');
      await loadFaces();
      onDone();
    } catch {
      toast.error('Could not remove that photo.');
    } finally {
      setRemovingId(null);
    }
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await faces.register(person.id, file);
      toast.success(`${person.display_name}'s face registered.`);
      setFile(null);
      setPreview(null);
      onDone();
      setStep('manage');
      await loadFaces();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read a face in that photo. Try a clearer, front-facing photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Register ${person.display_name}'s face`} width="sm">
      {step === 'consent' && (
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
            <ShieldIcon width={18} height={18} className="mt-0.5 flex-none" />
            <p>
              We store only a mathematical representation of the face (an embedding), never the photo. Consent is
              required before any face is registered, and can be removed at any time from this page.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Purpose</span>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={grantConsent} loading={busy}>
              I consent — continue
            </Button>
          </div>
        </div>
      )}

      {step === 'manage' && (
        <div className="space-y-4">
          {confirmUi}
          {!faceList && <p className="text-sm text-slate-400">Loading…</p>}
          {faceList?.length === 0 && <p className="text-sm text-slate-400">No photos registered yet.</p>}
          {faceList && faceList.length > 0 && (
            <ul className="space-y-2">
              {faceList.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="text-sm text-slate-700">
                    <p className="font-medium">Registered photo</p>
                    <p className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => removeFace(f.id)}
                    disabled={removingId === f.id}
                    className="rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-danger-500 disabled:opacity-50"
                    aria-label="Remove this photo"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => setStep('upload')}>+ Add a photo</Button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-600"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <>
                <CameraIcon width={28} height={28} />
                <span className="text-sm font-medium">Choose a clear, front-facing photo</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => (hasConsent ? setStep('manage') : onClose())}>
              Cancel
            </Button>
            <Button onClick={upload} loading={busy} disabled={!file}>
              Register face
            </Button>
          </div>
        </div>
      )}

    </Modal>
  );
}
