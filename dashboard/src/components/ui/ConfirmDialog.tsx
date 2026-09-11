import { useState } from 'react';

import { Button } from './Button';
import { Modal } from './Modal';

type Options = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
};

/**
 * Confirmation for destructive actions.
 *
 * const confirm = useConfirm();
 * const [ConfirmUI, confirm] = useConfirm();
 * ...
 * if (await confirm({ title: 'Remove Rahul?', tone: 'danger' })) { ... }
 */
export function useConfirm(): [React.ReactNode, (opts: Options) => Promise<boolean>] {
  const [state, setState] = useState<{ opts: Options; resolve: (v: boolean) => void } | null>(null);

  const confirm = (opts: Options) =>
    new Promise<boolean>((resolve) => setState({ opts, resolve }));

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  const ui = state ? (
    <Modal open onClose={() => close(false)} title={state.opts.title} description={state.opts.description} width="sm">
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => close(false)}>
          Cancel
        </Button>
        <Button variant={state.opts.tone === 'primary' ? 'primary' : 'danger'} onClick={() => close(true)}>
          {state.opts.confirmLabel ?? 'Confirm'}
        </Button>
      </div>
    </Modal>
  ) : null;

  return [ui, confirm];
}
