export default function GallerySkeleton() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-secondary-100 rounded" />
          <div className="h-8 w-40 bg-secondary-100 rounded-lg" />
          <div className="h-4 w-72 bg-secondary-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-secondary-100" />
        ))}
      </div>
      <div className="flex items-center gap-1 border-b border-secondary-200 pb-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 bg-secondary-100 rounded-t-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[4/3] rounded-xl bg-secondary-100" />
        ))}
      </div>
    </div>
  );
}