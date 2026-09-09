import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError, auth } from '../api';
import { useAuth } from '../auth';
import { Button, Card, Field, Input } from '../ui';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        await auth.register(email, password, name);
      }
      await login(email, password);
      nav('/patients');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Alzheimer's Companion</h1>
        <p className="mb-5 text-sm text-slate-500">Caregiver dashboard</p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          className="mt-4 text-sm text-brand-600 hover:underline"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Create a caregiver account' : 'I already have an account'}
        </button>
      </Card>
    </div>
  );
}
