import Link from "next/link";
import Image from "next/image";
import SearchBar from "@/components/ui/SearchBar";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-border)]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="https://tim-management.co/wp-content/uploads/logo.png"
            alt="TIM Management"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
          <span className="font-semibold text-[var(--color-text)] text-sm hidden sm:block">
            Centre d&apos;aide
          </span>
        </Link>

        {/* Barre de recherche centrée */}
        <div className="flex-1">
          <SearchBar compact />
        </div>

        {/* Lien retour app */}
        <a
          href={process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tim-management.co"}
          className="shrink-0 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors hidden sm:block"
        >
          ← Retour à l&apos;app
        </a>
      </div>
    </header>
  );
}
