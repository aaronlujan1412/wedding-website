"use client";

import {
  Select,
  SelectContent,
  SelectItem,
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
  "h-9 w-full rounded-md border border-input bg-background px-3 font-raleway text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

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

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="w-full font-raleway text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {/* Tailwind v4 doesn't resolve the popover background variable for Radix
          primitives on its own, so bg-card is explicit here as everywhere. */}
      <SelectContent className="bg-card">
        {options.map((o) => (
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
