"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
      <h2 className="text-[16px] font-semibold">Something went wrong</h2>
      <p className="max-w-[420px] text-body-sm text-foreground/55">
        {error.message || "This view crashed. Your dots keep working in the background."}
      </p>
      <button className="btn-secondary h-9 px-4 text-[13px]" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
