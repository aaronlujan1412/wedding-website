"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { NAV_ITEMS } from "./NavBarItems";

export function Navbar() {
  return (
    <nav className="text-primary-foreground flex fixed top-0 left-0 right-0 z-50 w-full max-w-full">
      {/* Left */}
      <div className="gap-5 flex flex-1 justify-end items-center">
        {NAV_ITEMS.filter((i) => i.position === "left").map((link) => (
          <Link className="px-4 py-2" key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
      {/* Middle */}
      <div className="text-8xl">
        {NAV_ITEMS.filter((i) => i.position === "center").map((link) => (
          <Link className="font-corinthia" key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
      {/* Right */}
      <div className="gap-5 flex flex-1 justify-start items-center">
        {NAV_ITEMS.filter((i) => i.position === "right").map((link) => (
          <Link className="px-4 py-2" key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
