"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 p-8 text-center" role="alert">
          <h2 className="text-[16px] font-semibold">Something went wrong</h2>
          <p className="max-w-[420px] text-[14px] opacity-60">
            {error.message || "The app crashed. Restart to continue — your dots keep working in the background."}
          </p>
          <button
            className="rounded-lg border px-4 py-2 text-[13px]"
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
