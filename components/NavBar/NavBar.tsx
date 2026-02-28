"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { NAV_ITEMS } from "./NavBarItems";
import Image from "next/image";

export function Navbar() {
  return (
    <nav className="text-primary-foreground flex fixed top-15 left-0 right-0 z-50 w-full max-w-full font-raleway">
      {/* Left */}
      <div className="gap-5 flex flex-1 justify-evenly items-center">
        {NAV_ITEMS.filter((i) => i.position === "left").map((link) => (
          <Link className="px-4 py-2" key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
      {/* Middle */}
      <Link href={"/"}>
        <Image
          src={"/media/LogoWhite.png"}
          width={300}
          height={150}
          alt="Logo of initials."
          className="w-auto h-auto max-w-24"
        ></Image>
      </Link>
      {/* Right */}
      <div className="gap-5 flex flex-1 justify-evenly items-center">
        {NAV_ITEMS.filter((i) => i.position === "right").map((link) => (
          <Link className="px-4 py-2" key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
