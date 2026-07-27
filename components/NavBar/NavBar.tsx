"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "./NavBarItems";

const leftLinks = NAV_ITEMS.filter((i) => i.position === "left");
const rightLinks = NAV_ITEMS.filter((i) => i.position === "right");

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const compact = !isHome || scrolled;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () =>
      setScrolled(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  return (
    <nav
      className={`fixed left-0 right-0 z-50 flex w-full items-center font-raleway text-primary-foreground transition-all duration-300 motion-reduce:transition-none ${compact ? "top-0 bg-primary py-2 shadow-md" : "top-5 bg-transparent py-4"}`}
    >
      {compact ? (
        <div className="mx-auto flex w-full max-w-6xl items-center px-6">
          <Logo className="max-w-10 pt-2 pb-2" />
          <div className="ml-auto flex items-center gap-6">
            {[...leftLinks, ...rightLinks].map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-1 justify-evenly">
            {leftLinks.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </div>
          <Logo className="max-w-24" />
          <div className="flex flex-1 justify-evenly">
            {rightLinks.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </div>
        </>
      )}
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="px-4 py-2" href={href}>
      {label}
    </Link>
  );
}

function Logo({ className }: { className: string }) {
  return (
    <Link href="/">
      <Image
        src="/media/LogoWhite.png"
        width={300}
        height={150}
        alt="Logo of initials."
        className={`h-auto w-auto transition-all duration-300 ${className}`}
      />
    </Link>
  );
}
