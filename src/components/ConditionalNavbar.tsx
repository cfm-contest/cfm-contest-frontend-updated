// components/ConditionalNavbar.tsx

"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar/Navbar";

export function ConditionalNavbar() {
    const pathname = usePathname();

    const shouldHide =
        pathname?.startsWith("/problem/") ||
        /^\/contests\/[^/]+\/tasks(?:\/|$)/.test(pathname ?? "");

    if (shouldHide) {
        return null;
    }

    return <Navbar />;
}
