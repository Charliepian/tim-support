import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-16">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-muted)]">
        <p>© {new Date().getFullYear()} TIM Management — Centre d&apos;aide</p>
        <nav className="flex items-center gap-6">
          <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
            Accueil
          </Link>
          <a
            href="https://tim-management.co"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Site TIM Management
          </a>
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tim-management.co"}
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Accéder au logiciel
          </a>
        </nav>
      </div>
    </footer>
  );
}
