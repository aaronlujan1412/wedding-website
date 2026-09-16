"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Shared bits for the planner's dialogs. Nothing here is site-wide. */

export function Fieldset({
  legend,
  children,
  className,
}: {
  legend: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="mb-2 font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
  group = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * For controls made of several inputs. A `<label>` forwards a click on its
   * text to its first labelable child, which for the cost field is the ¥
   * button — so clicking the word "Cost" would silently switch currency.
   */
  group?: boolean;
}) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper
      className={cn("block", className)}
      role={group ? "group" : undefined}
      aria-label={group ? label : undefined}
    >
      <span className="font-raleway text-xs text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && (
        <span className="mt-1 block font-garamond text-xs leading-snug text-muted-foreground">
          {hint}
        </span>
      )}
    </Wrapper>
  );
}

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-raleway text-base text-foreground sm:h-9 sm:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      {...props}
      className={cn(
        controlClass,
        "h-auto resize-y py-2 leading-relaxed",
        props.className,
      )}
    />
  );
}

export type Option<T extends string> = { value: T; label: string };

/**
 * A select, optionally in labelled groups. The item list is what turns a long
 * enum back into a short decision — fourteen card types read as three choices
 * once they are sorted into unsorted, things to do, and blocked out.
 */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  groups,
  placeholder,
}: {
  value: T;
  onChange: (value: T) => void;
  options?: Option<T>[];
  groups?: { label: string; options: Option<T>[] }[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="w-full font-raleway text-base max-sm:h-10 sm:text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {/* Tailwind v4 doesn't resolve the popover background variable for Radix
          primitives on its own, so bg-card is explicit here as everywhere. */}
      <SelectContent className="bg-card">
        {groups
          ? groups.map((g) => (
              <SelectGroup key={g.label}>
                <SelectLabel className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {g.label}
                </SelectLabel>
                {g.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          : options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-none accent-primary"
      />
      <span>
        <span className="font-raleway text-sm text-foreground">{label}</span>
        {hint && (
          <span className="block font-garamond text-xs leading-snug text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * Every planner dialog is a centred card on a desktop and a sheet from the
 * bottom on a phone, where it can use the full width and the thumb can reach
 * it. The content scrolls inside the sheet, and the footer sticks to its
 * bottom edge so Save is always in reach on a long form — which is why the
 * sheet has no bottom padding of its own.
 */
export const SHEET = cn(
  "overflow-y-auto overscroll-contain bg-card pb-0",
  "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92dvh] max-sm:max-w-none",
  "max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0",
  "max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=closed]:slide-out-to-bottom",
);

export const SHEET_FOOTER = cn(
  "sticky bottom-0 z-10 -mx-6 gap-2 border-t border-border bg-card px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
  // On a phone the buttons share the width, so each is a thumb-sized target.
  "max-sm:[&>button]:h-11 max-sm:[&>div]:flex max-sm:[&>div]:w-full max-sm:[&>div>button]:h-11 max-sm:[&>div>button]:flex-1",
);
