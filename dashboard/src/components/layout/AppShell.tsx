import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Header } from './Header';
import { Sidebar } from './Sidebar';

/**
 * Each page is a small composition, not one colour: a very light base tint (kept close to
 * white so cards stand out) plus a soft wash of a *different* hue fading out from the top.
 * Keys are the route segment after /patients/:id/. Full class strings so Tailwind sees them.
 */
const PAGE_BG: Record<string, { base: string; wash: string }> = {
  dashboard: { base: 'bg-[#F8F8F3]', wash: 'from-[#E4F1EE]' }, // Overview: neutral ivory + pale teal
  people: { base: 'bg-[#F5F8F2]', wash: 'from-[#FBE8DB]/70' }, // pale sage + a touch of peach
  memories: { base: 'bg-[#F9F7FB]', wash: 'from-[#F8E4EA]/80' }, // light lavender + blush
  medication: { base: 'bg-[#FBF8F4]', wash: 'from-[#DFF0E6]/80' }, // faint peach + mint
  location: { base: 'bg-[#F4F8FB]', wash: 'from-[#E3EEDD]/80' }, // pale sky + sage
  alerts: { base: 'bg-[#FBF6F7]', wash: 'from-[#ECE6F5]/80' }, // soft blush + lavender
  settings: { base: 'bg-[#F5F6F3]', wash: 'from-[#E3EFEC]/80' }, // warm grey-green + teal mist
};
const DEFAULT_PAGE = { base: 'bg-[#F7F7F2]', wash: 'from-[#EEF3EA]' };

/**
 * Application shell: a fixed sidebar (drawer on mobile/tablet) + header + the routed
 * page in <Outlet/>. Every authenticated page renders inside this.
 */
export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();
  const section = /^\/patients\/[^/]+\/([^/]+)/.exec(pathname)?.[1] ?? '';
  const page = PAGE_BG[section] ?? DEFAULT_PAGE;

  return (
    <div className="flex h-screen overflow-hidden bg-cream-200">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-slide-up">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMobileNavOpen(true)} />
        <main className={`relative flex-1 overflow-y-auto ${page.base}`}>
          <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b ${page.wash} to-transparent`} />
          <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
