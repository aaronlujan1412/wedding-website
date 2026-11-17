import type { ReactNode } from "react";
import { HelperShell } from "@/components/helpers/HelperView";

/** The heading and role buttons every helper page shares, so switching
    pages or tabs swaps only what's under them. */
export default function HelpersLayout({ children }: { children: ReactNode }) {
  return <HelperShell>{children}</HelperShell>;
}
