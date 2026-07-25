export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-50">
      <div className="text-center">
        <p className="font-heading text-2xl text-foreground-900 tracking-tight">
          Wedora
        </p>
        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="sr-only">Loading page...</span>
      </div>
    </div>
  );
}