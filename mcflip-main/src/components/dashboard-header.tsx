"use client"

import { Boxes, CreditCard, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardHeader() {
    const pathname = usePathname();

    return <div className="container mx-auto p-4">
        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
            <Link href="/dashboard" className="flex-1">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    Posting
                </Button>
            </Link>
            <Link href="/dashboard/delete" className="flex-1">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard/delete" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    Delete Listings
                </Button>
            </Link>
            <Link href="/dashboard/settings" className="flex-1">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard/settings" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Button>
            </Link>
            <Link href="/dashboard/subscription" className="flex-1">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard/subscription" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Subscription
                </Button>
            </Link>
            <Link href="/dashboard/inventory" className="flex-1">
                <Button 
                    variant="outline" 
                    className={`w-full ${pathname === "/dashboard/inventory" ? "bg-accent text-accent-foreground" : ""}`}
                >
                    <Boxes className="w-4 h-4 mr-2" />
                    Bulk Inventory
                </Button>
            </Link>
        </div>
    </div>
}