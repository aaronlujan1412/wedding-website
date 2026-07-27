"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/components/NavBar/NavBarItems";
import { RsvpButton } from "@/components/rsvp/RsvpButton";
import { useRsvp } from "@/components/rsvp/RsvpProvider";

const leftLinks = NAV_ITEMS.filter((i) => i.position === "left");
const rightLinks = NAV_ITEMS.filter((i) => i.position === "right");
const mobileLinks = [{ href: "/", label: "Home" }, ...leftLinks, ...rightLinks];

export function SideNav() {
  const pathname = usePathname();
  const { openRsvp } = useRsvp();
  const [open, setOpen] = useState(false);

  const handleRsvp = () => {
    setOpen(false);
    setTimeout(openRsvp, 250);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px]">
        <SheetHeader className="items-center">
          <SheetTitle className="font-corinthia text-4xl text-pop">
            Aaron &amp; Savea
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col px-4">
          {mobileLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`border-b border-border py-4 font-raleway text-lg tracking-wide transition-colors ${
                    isActive
                      ? "font-semibold text-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="mt-2 px-4">
          <RsvpButton variant="sidenav" onClick={handleRsvp} />
        </div>

        <SheetFooter>
          <p className="text-center font-raleway text-xs uppercase tracking-[0.2em] text-muted-foreground">
            12 · 01 · 2026
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
