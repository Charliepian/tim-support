import Link from "next/link";
import type { FeatureTerm } from "@/lib/types";

interface Props {
  categories:      FeatureTerm[];
  currentCategory: string;
}

export default function FeatureSidebar({ categories, currentCategory }: Props) {
  // Sépare racines (parent=0) et enfants
  const roots    = categories.filter((c) => !c.parent || c.parent === 0);
  const children = categories.filter((c) => c.parent && c.parent > 0);

  const childrenOf = (parentId: number) =>
    children.filter((c) => c.parent === parentId);

  const isActive = (slug: string) => currentCategory === slug;

  const linkClass = (slug: string, isChild = false) =>
    `block text-sm px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
      isChild ? "pl-5" : ""
    } ${
      isActive(slug)
        ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
        : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
    }`;

  return (
    <aside className="w-52 shrink-0 hidden lg:block">
      <nav className="sticky top-24 space-y-1">

        {/* Toutes */}
        <Link href="/features" className={linkClass("__all")}>
          Toutes les fonctionnalités
        </Link>

        <div className="pt-2 space-y-4">
          {roots.map((root) => {
            const kids = childrenOf(root.id);

            return (
              <div key={root.id}>
                {/* Section parente — cliquable pour filtrer */}
                <Link
                  href={`/features?category=${root.slug}`}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-[var(--radius-md)] transition-colors text-xs font-semibold uppercase tracking-wider ${
                    isActive(root.slug)
                      ? "text-[var(--color-primary)] bg-[var(--color-primary-light)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {root.name}
                  {root.count !== undefined && root.count > 0 && (
                    <span className="text-xs font-normal normal-case tracking-normal opacity-60">
                      {root.count}
                    </span>
                  )}
                </Link>

                {/* Sous-catégories */}
                {kids.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {kids.map((child) => (
                      <Link
                        key={child.id}
                        href={`/features?category=${child.slug}`}
                        className={linkClass(child.slug, true)}
                      >
                        <span className="flex items-center justify-between gap-2">
                          {child.name}
                          {child.count !== undefined && child.count > 0 && (
                            <span className="text-xs text-[var(--color-muted)]">
                              {child.count}
                            </span>
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
