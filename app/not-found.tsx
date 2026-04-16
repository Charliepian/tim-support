import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
      <p className="text-5xl">😕</p>
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        Page introuvable
      </h1>
      <p className="text-[var(--color-muted)]">
        Cet article n&apos;existe pas ou a été déplacé.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
