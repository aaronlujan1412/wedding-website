"use client"

import * as React from "react"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function Navbar() {
    return (
        <NavigationMenu>
            <NavigationMenuList>
                <NavigationMenuItem>
                    <NavigationMenuTrigger>Help</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid gap-1 p-3 w-[200px]">
                                <li>Please.</li>
                                <li>I'm not kidding.</li>
                            </ul>
                        </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                    I'm trapped in this navigation menu
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    )
}

const ListItem = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentPropsWithoutRef<"a">
    >(({ className, title, children, href, ...props }, ref) => {
        return (
            <li>
                <NavigationMenuLink asChild>
                    <Link
                        ref={ref}
                        href={href!}
                        className={cn(
                            "blcok select-none space-y-1 rounded-md p-3 leading-none no-underline",
                            className
                        )}
                        {...props}
                        >
                            <div className="text-sm font-medium leading-none">{title}</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                {children}
                            </p>
                        </Link>
                </NavigationMenuLink>
            </li>
        )
    })
    ListItem.displayName = "ListItem"