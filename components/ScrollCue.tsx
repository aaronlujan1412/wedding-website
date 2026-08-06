import Link from "next/link";
import { ChevronDown } from "lucide-react";

export function ScrollCue({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Scroll to see more"
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 font-raleway text-primary"
    >
      <span className="text-xs uppercase tracking-[0.3em]">Scroll</span>
      <ChevronDown
        className="h-6 w-6 animate-scroll-cue motion-reduce:animate-none"
        strokeWidth={1.5}
      />
    </Link>
  );
}
