/**
 * Where to find me. The list is the page: adding a row here adds a row there,
 * in this order, renumbered on its own.
 *
 * Nothing is added with a placeholder href. A dead link on a landing page is
 * worse than a missing one, and the whole page is three rows long — an empty
 * slot is obvious, a 404 behind "LinkedIn" is not.
 */
export type MeLink = {
  /** The name of the place. */
  label: string;
  /** The handle or address, shown under the label — who you'd be reaching. */
  detail: string;
  href: string;
};

export const ME_LINKS: MeLink[] = [
  {
    label: "GitHub",
    detail: "aaronlujan1412",
    href: "https://github.com/aaronlujan1412",
  },
  {
    label: "Email",
    detail: "aaron.lujan1412@gmail.com",
    href: "mailto:aaron.lujan1412@gmail.com",
  },
  // {
  //   label: "LinkedIn",
  //   detail: "in/<handle>",
  //   href: "https://www.linkedin.com/in/<handle>",
  // },
];

/** Anything off-site opens in a new tab; a mailto must not. */
export const isExternal = (href: string) => href.startsWith("http");
