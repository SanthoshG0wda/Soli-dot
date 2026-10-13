import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-[16px] font-semibold">Not found</h2>
      <p className="max-w-[420px] text-body-sm text-foreground/55">
        This dot, chat, or page doesn&apos;t exist. It may have been deleted.
      </p>
      <Link href="/" className="btn-secondary h-9 px-4 text-[13px] leading-9">
        Back home
      </Link>
    </div>
  );
}
