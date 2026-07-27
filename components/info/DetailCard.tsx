import type { Detail } from "./details";

export function DetailCard({ detail }: { detail: Detail }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-6">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-2xl leading-none"
        aria-hidden="true"
      >
        {detail.icon}
      </span>
      <h3 className="mt-4 font-garamond text-xl text-foreground">
        {detail.title}
      </h3>
      <p className="mt-2 font-garamond text-base leading-relaxed text-foreground/90">
        {detail.description}
      </p>
    </div>
  );
}
