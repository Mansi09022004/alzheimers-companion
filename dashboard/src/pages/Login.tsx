import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError, auth, setRememberMe } from '../api';
import { useAuth } from '../auth';
import { GOOGLE_CLIENT_ID } from '../config';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  MemoryIcon,
  ShieldIcon,
  UsersIcon,
} from '../components/ui/icons';

const VALUES = [
  { icon: UsersIcon, text: 'Recognise the people who matter' },
  { icon: MemoryIcon, text: 'Turn everyday moments into lasting memories' },
  { icon: ShieldIcon, text: 'A safer, more confident day' },
];

// A soft, off-centre spotlight so the two women stay bright while the text side stays legible.
const HERO_OVERLAY =
  'linear-gradient(100deg, rgba(22,51,48,0.97) 0%, rgba(22,51,48,0.88) 32%, rgba(22,51,48,0.5) 58%, rgba(22,51,48,0.14) 85%)';

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const rememberRef = useRef(remember);
  rememberRef.current = remember;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;
    let cancelled = false;
    const tryInit = () => {
      if (cancelled || !window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          setError(null);
          setGoogleBusy(true);
          setRememberMe(rememberRef.current);
          try {
            await loginWithGoogle(resp.credential);
            nav('/patients');
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
          } finally {
            setGoogleBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: '336',
        text: 'continue_with',
      });
    };
    if (window.google) tryInit();
    else {
      const t = setInterval(() => {
        if (window.google) {
          tryInit();
          clearInterval(t);
        }
      }, 150);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRememberMe(remember);
    try {
      if (mode === 'register') {
        await auth.register(email, password, name);
      }
      await login(email, password);
      nav('/patients');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      {/* Hero panel */}
      <div
        className="relative hidden overflow-hidden bg-cover px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundImage: "url('/images/login-hero.png')", backgroundPosition: '30% center' }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: HERO_OVERLAY }} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 via-transparent to-transparent" />

        <div className="relative flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="" className="h-9 w-9 object-contain drop-shadow-md" />
          <span className="text-sm font-semibold tracking-wide">Alzheimer's Companion</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral-300">For families, with love</p>
          <p className="mt-3 font-display text-[36px] font-medium leading-[1.2] text-white">
            Because familiar faces bring brighter days.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/75">
            Alzheimer's Companion helps families stay connected, preserve precious moments, and create a
            safer, more confident everyday for their loved ones.
          </p>

          <ul className="mt-8 space-y-3.5">
            {VALUES.map((v) => (
              <li key={v.text} className="flex items-center gap-3 text-[14px] text-white/90">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10">
                  <v.icon width={15} height={15} />
                </span>
                {v.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="flex items-center gap-5 border-t border-white/15 pt-5 text-xs text-white/60">
            <span className="flex items-center gap-1.5"><ShieldIcon width={13} height={13} /> Privacy-first by design</span>
            <span className="flex items-center gap-1.5"><MemoryIcon width={13} height={13} /> Built for real families</span>
          </div>
        </div>
      </div>

      {/* Auth panel */}
      <div className="flex flex-col items-center bg-cream-100 px-6 py-10 lg:justify-center lg:py-16">
        <div
          className="mb-8 w-full max-w-sm overflow-hidden rounded-3xl bg-cover px-6 py-7 text-white lg:hidden"
          style={{ backgroundImage: `${HERO_OVERLAY.replace('100deg', '60deg')}, url('/images/login-hero.png')`, backgroundPosition: 'center', backgroundSize: 'cover' }}
        >
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
            <span className="text-sm font-semibold">Alzheimer's Companion</span>
          </div>
          <p className="mt-4 font-display text-lg font-medium leading-snug text-white">
            Because familiar faces bring brighter days.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink-900">
            {mode === 'login' ? 'Welcome back 👋' : "Let's get you set up"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {mode === 'login'
              ? 'Sign in to continue caring with Alzheimer\'s Companion.'
              : 'Create your caregiver account to start building their companion.'}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && (
              <Field label="Your name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </Field>
            )}
            <Field label="Email">
              <div className="relative">
                <MailIcon width={17} height={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" placeholder="you@example.com" />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <LockIcon width={17} height={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                >
                  {showPassword ? <EyeOffIcon width={17} height={17} /> : <EyeIcon width={17} height={17} />}
                </button>
              </div>
            </Field>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-ink-500">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-200"
                  />
                  Remember me
                </label>
                <div className="relative">
                  <button type="button" onClick={() => setForgotOpen((o) => !o)} className="font-semibold text-brand-600 hover:underline">
                    Forgot password?
                  </button>
                  {forgotOpen && (
                    <div className="absolute right-0 top-7 z-10 w-56 rounded-2xl bg-ink-900 px-3.5 py-3 text-xs leading-relaxed text-white shadow-popover">
                      Self-serve reset isn't available yet — ask another caregiver on the account, or your administrator.
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-danger-50 px-4 py-3 text-sm text-danger-700">
                <AlertTriangleIcon width={16} height={16} className="mt-0.5 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={busy} disabled={googleBusy} className="w-full">
              {mode === 'login' ? 'Sign in' : 'Create account'}
              {!busy && <ArrowRightIcon width={17} height={17} />}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="mt-6 flex items-center gap-3 text-xs font-medium text-ink-400">
                <span className="h-px flex-1 bg-ink-200" /> or continue with <span className="h-px flex-1 bg-ink-200" />
              </div>
              <div className="mt-4 flex justify-center">
                <div ref={googleBtnRef} className={googleBusy ? 'pointer-events-none opacity-50' : ''} />
              </div>
            </>
          )}

          <div className="mt-7 rounded-2xl bg-cream-200/60 px-4 py-3.5 text-center text-sm text-ink-600">
            {mode === 'login' ? "Don't have an account? " : 'Already caring with us? '}
            <button
              className="font-semibold text-brand-600 hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? 'Create a caregiver account →' : 'Sign in →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
