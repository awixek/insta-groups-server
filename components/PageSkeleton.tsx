import Header from "@/components/Header";

function CardSkeleton() {
  return (
    <div className="card flex flex-col gap-3 animate-pulse" aria-hidden="true">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-fg/10" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <div className="h-3.5 w-2/3 rounded bg-fg/10" />
          <div className="h-3 w-1/3 rounded bg-fg/10" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-fg/10" />
      <div className="h-3 w-4/5 rounded bg-fg/10" />
      <div className="flex justify-between pt-3 border-t border-border">
        <div className="h-8 w-28 rounded-full bg-fg/10" />
        <div className="h-9 w-20 rounded-xl bg-fg/10" />
      </div>
    </div>
  );
}

/** Shown instantly while a listing page loads, so navigation never flashes blank. */
export default function PageSkeleton() {
  return (
    <div className="skin">
      <Header />
      <div className="max-w-6xl mx-auto px-4 mt-8" role="status" aria-label="Loading">
        <div className="h-9 w-64 max-w-full rounded bg-fg/10 animate-pulse" />
        <div className="h-4 w-48 max-w-full rounded bg-fg/10 animate-pulse mt-3" />
        <div className="h-12 rounded-full bg-fg/10 animate-pulse mt-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
