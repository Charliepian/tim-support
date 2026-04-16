import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
      <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
        Aide
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--color-primary)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--color-text)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
