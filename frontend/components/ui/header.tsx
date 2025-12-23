"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const Header = () => {
    const pathname = usePathname();

    const navItemClass = (href: string) =>
        `px-6 py-2 rounded-full font-medium transition-all duration-200 ${pathname === href
            ? "bg-white/20 text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`;

    return (
        <div className="relative z-10 flex justify-center p-6 w-full top-0">
            <nav className="flex items-center justify-between gap-8 px-8 py-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl max-w-6xl w-full">
                <span className="text-2xl font-bold text-white">
                    pixl<span className="text-cyan-400">.</span>
                </span>

                <div className="hidden md:flex items-center gap-2">
                    <Link href="/" className={navItemClass("/")}>Home</Link>
                    <Link href="/analytics" className={navItemClass("/analytics")}>Analytics</Link>
                    <Link href="/videos" className={navItemClass("/videos")}>Videos</Link>
                    <Link href="/upload" className={navItemClass("/upload")}>Upload</Link>
                </div>
            </nav>
        </div>
    );
};
