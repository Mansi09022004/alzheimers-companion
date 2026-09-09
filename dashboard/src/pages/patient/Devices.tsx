import { useState } from 'react';

import { patients } from '../../api';
import { Button, Card, Field, Input, SectionTitle } from '../../ui';

export function DevicesSection({ patientId }: { patientId: number }) {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const provision = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await patients.createDevice(patientId, label || "Patient's phone");
      setCode(res.pairing_code);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SectionTitle>Patient device</SectionTitle>
      <Card>
        <p className="mb-3 text-sm text-slate-500">
          Generate a one-time pairing code, then enter it in the patient app to link this device.
        </p>
        <form onSubmit={provision} className="flex items-end gap-3">
          <Field label="Device name">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Dad's phone" />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? '…' : 'Generate code'}
          </Button>
        </form>

        {code && (
          <div className="mt-4 rounded-lg bg-brand-50 p-4 text-center">
            <div className="text-xs text-slate-500">Pairing code (valid ~15 minutes)</div>
            <div className="mt-1 font-mono text-3xl tracking-[0.3em] text-brand-700">{code}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
