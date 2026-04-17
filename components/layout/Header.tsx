"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import SearchModal from "@/components/ui/SearchModal";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K pour ouvrir la recherche
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-none px-6 h-16 flex items-center gap-6">

          {/* Logo — tout à gauche */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="https://support-tim-management.co/wp-content/uploads/2026/04/logo_tim_management_nom.webp"
              alt="TIM Management"
              width={160}
              height={32}
              className="h-8 w-auto"
            />
          </Link>

          {/* Trigger recherche — centré */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-3 w-full max-w-sm h-9 px-3 bg-surface border border-border rounded-md text-sm text-muted hover:border-[#b4b4b4] hover:bg-white transition-all group"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <span className="flex-1 text-left">Rechercher...</span>
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-white text-muted group-hover:border-[#b4b4b4]/40 transition-colors">
                <span>⌘</span><span>K</span>
              </kbd>
            </button>
          </div>

          {/* Retour à l'app — tout à droite */}
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tim-management.co"}
            className="shrink-0 text-sm text-muted hover:text-foreground transition-colors hidden sm:flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à l&apos;app
          </a>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
