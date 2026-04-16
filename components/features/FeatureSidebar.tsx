import Link from "next/link";
import type { FeatureTerm } from "@/lib/types";

interface Props {
  platforms:       FeatureTerm[];
  categories:      FeatureTerm[];
  currentPlatform: string;
  currentCategory: string;
}

export default function FeatureSidebar({
  platforms,
  categories,
  currentPlatform,
  currentCategory,
}: Props) {
  const buildHref = (platform: string, category: string) => {
    const params = new URLSearchParams();
    if (platform) params.set("platform", platform);
    if (category) params.set("category", category);
    const qs = params.toString();
    return `/features${qs ? `?${qs}` : ""}`;
  };

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-6">

        {/* Plateformes */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-2">
            Plateforme
          </p>
          <div className="flex flex-col gap-1">
            <Link
              href={buildHref("", currentCategory)}
              className={`text-sm px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                !currentPlatform
                  ? "bg-[var(--color-primary)] text-white font-medium"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              }`}
            >
              Toutes
            </Link>
            {platforms.map((p) => (
              <Link
                key={p.id}
                href={buildHref(p.slug, currentCategory)}
                className={`text-sm px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                  currentPlatform === p.slug
                    ? "bg-[var(--color-primary)] text-white font-medium"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Catégories */}
        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-2">
              Catégories
            </p>
            <div className="flex flex-col gap-1">
              <Link
                href={buildHref(currentPlatform, "")}
                className={`text-sm px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                  !currentCategory
                    ? "text-[var(--color-primary)] font-medium bg-[var(--color-primary-light)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                }`}
              >
                Toutes
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={buildHref(currentPlatform, c.slug)}
                  className={`text-sm px-3 py-1.5 rounded-[var(--radius-md)] transition-colors flex items-center justify-between gap-2 ${
                    currentCategory === c.slug
                      ? "text-[var(--color-primary)] font-medium bg-[var(--color-primary-light)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-[var(--color-muted)]">{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
