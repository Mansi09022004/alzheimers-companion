/** Skeleton rows — used instead of a spinner where layout should stay stable. */
export function SkeletonRows({ count = 3, height = 'h-20' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse rounded-xl border border-slate-100 bg-slate-100 ${height}`} />
      ))}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-9 w-9 border-[3px]' }[size];
  return <div className={`animate-spin rounded-full border-slate-200 border-t-brand-500 ${px}`} />;
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  );
}
