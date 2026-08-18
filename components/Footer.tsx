import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-14">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <p className="font-corinthia text-4xl leading-none text-pop">
          Aaron &amp; Savea
        </p>
        <p className="mt-2 font-raleway text-xs uppercase tracking-[0.2em] text-muted-foreground">
          12 · 01 · 2026
        </p>
        <Link
          href="/hosts"
          className="mt-8 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/70 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Hosts
        </Link>
      </div>
    </footer>
  );
}
