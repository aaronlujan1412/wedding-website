/**
 * The board's form furniture, in one place.
 *
 * `text-base sm:text-[13px]` is not a style choice — anything under 16px makes
 * iOS Safari zoom the page when the field takes focus, and it does not zoom
 * back out. Same rule the planner's FormParts follows.
 */
export const INPUT =
  "w-full bevel-in bg-me-void px-2 py-1.5 text-base leading-relaxed text-me-ink placeholder:text-me-dim sm:text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold";

/** The same, for a name sitting inline in a list row. */
export const INPUT_INLINE =
  "bevel-in bg-me-panel px-1.5 py-1 text-base text-me-ink sm:text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-dot text-[11px] leading-none text-me-gold">
        {label}
      </span>
      <span className="mb-1 block text-[11px] leading-snug text-me-dim">{hint}</span>
      {children}
    </label>
  );
}
