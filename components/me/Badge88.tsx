import { BADGES } from "@/components/me/profile";

/**
 * The 88×31 button.
 *
 * The web badge is the most precisely dated object on the internet: for about
 * a decade every site's footer carried a row of them saying what it was built
 * with and what it was best viewed in. These say the same thing about this
 * one, at the same size, and they are the only place the site brags.
 */
export function BadgeStrip() {
  return (
    <ul className="flex flex-wrap gap-2">
      {BADGES.map((badge) => (
        <li
          key={badge.text}
          className="bevel-out flex h-[31px] w-[88px] overflow-hidden bg-me-void"
        >
          <span
            className="flex w-[26px] shrink-0 items-center justify-center font-dot text-[13px] leading-none text-me-void"
            style={{ backgroundColor: badge.chip }}
          >
            {badge.mark}
          </span>
          <span className="flex flex-1 items-center justify-center px-1 text-center font-dot text-[10px] leading-[1.15] text-me-ink">
            {badge.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
