"use client";

import { useFormStatus } from "react-dom";
import type { LibraryState } from "@/app/actions/meal-library";

/**
 * The small parts every editing form on these pages is built from.
 *
 * One place, because a site made of tables gets fifty of these and fifty
 * hand-written input classNames drift within a week.
 */

export const FIELD =
  "bevel-in bg-me-void px-2 py-1.5 text-[13px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold";

export const BUTTON =
  "bevel-out bg-me-bar px-3 py-1.5 font-dot text-[13px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60";

export function Submit({
  children,
  busy = "…",
  className = BUTTON,
}: {
  children: React.ReactNode;
  busy?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? busy : children}
    </button>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  width = "w-full",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  width?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${width}`}>
      <span className="font-dot text-[11px] text-me-dim">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={FIELD}
      />
    </label>
  );
}

export function Choice({
  label,
  name,
  options,
  defaultValue,
  width = "w-full",
}: {
  label: string;
  name: string;
  options: readonly (readonly [string, string])[];
  defaultValue?: string;
  width?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${width}`}>
      <span className="font-dot text-[11px] text-me-dim">{label}</span>
      <select name={name} defaultValue={defaultValue} className={FIELD}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Whatever the last action said, in the right ink. */
export function Says({ state }: { state: LibraryState }) {
  return (
    <p aria-live="polite" className="min-h-[1.1rem] text-[12px] leading-relaxed">
      {state.error ? (
        <span className="text-me-live">{state.error}</span>
      ) : state.note ? (
        <span className="text-me-dim">{state.note}</span>
      ) : null}
    </p>
  );
}

export const EMPTY: LibraryState = { error: null, note: null };
