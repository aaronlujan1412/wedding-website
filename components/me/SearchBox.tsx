/**
 * A plain GET form. The query lives in the URL, so a search is linkable, the
 * back button works, and the page stays a server component — none of which a
 * controlled input with an onChange would give us.
 */
export function SearchBox({
  action = "/me/brain/notes",
  defaultValue = "",
  autoFocus = false,
}: {
  action?: string;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action={action} className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        Search notes
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="a word, a phrase, half a title…"
        className="bevel-in min-w-0 flex-1 bg-me-void px-2.5 py-2 text-[13px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      />
      <button
        type="submit"
        className="bevel-out bg-me-bar px-4 py-2 font-dot text-[14px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in"
      >
        search
      </button>
    </form>
  );
}
