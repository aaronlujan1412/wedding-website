"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { 
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

export function SideNav() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" className="p-2 md:hidden" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px]">
                <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                {/* Add navigation links or other content here */}
            </SheetContent>
        </Sheet>
    )
}