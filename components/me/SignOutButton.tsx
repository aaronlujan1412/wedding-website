import { signOutOfBrain } from "@/app/actions/auth";

/** A form, not a link: signing out is a write, and a GET that logs you out can
 *  be triggered by anything that can make your browser fetch a URL. */
export function SignOutButton() {
  return (
    <form action={signOutOfBrain}>
      <button
        type="submit"
        className="bevel-out bg-me-bar px-3 py-1.5 font-dot text-[14px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in"
      >
        sign out
      </button>
    </form>
  );
}
