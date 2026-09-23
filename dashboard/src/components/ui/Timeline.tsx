import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type TimelineItem = {
  id: string;
  icon: ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'lavender' | 'slate';
  title: string;
  time: string;
  subtitle?: string;
  href?: string;
};

const DOT: Record<TimelineItem['tone'], string> = {
  blue: 'bg-brand-100 text-brand-600',
  green: 'bg-sage-100 text-sage-600',
  amber: 'bg-warning-50 text-warning-600',
  red: 'bg-danger-50 text-danger-600',
  lavender: 'bg-lavender-100 text-lavender-600',
  slate: 'bg-ink-100 text-ink-500',
};

/** A chronological activity feed — alerts, memories, and other events in one timeline. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative">
      {items.map((item, i) => {
        const body = (
          <>
            <p className="text-sm text-ink-800">{item.title}</p>
            {item.subtitle && <p className="mt-0.5 text-xs text-ink-500">{item.subtitle}</p>}
            <p className="mt-0.5 text-xs text-ink-400">{item.time}</p>
          </>
        );
        return (
          <div key={item.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < items.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-ink-100" />}
            <span className={`z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full ${DOT[item.tone]}`}>
              {item.icon}
            </span>
            {item.href ? (
              <Link to={item.href} className="-mx-2 min-w-0 flex-1 rounded-lg px-2 pt-1 transition-colors hover:bg-cream-100">
                {body}
              </Link>
            ) : (
              <div className="min-w-0 flex-1 pt-1">{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
