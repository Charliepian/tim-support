import { getFeatures, getFeatureCategories } from "@/lib/wordpress";
import SearchBar from "@/components/ui/SearchBar";
import FeatureCard from "@/components/features/FeatureCard";
import Link from "next/link";
import type { FeatureTerm } from "@/lib/types";

export const revalidate = 3600;

const PLATFORM_ICONS: Record<string, string> = {
  web:    "🖥️",
  mobile: "📱",
};

export default async function HomePage() {
  const [allFeatures, categories] = await Promise.all([
    getFeatures(),
    getFeatureCategories(),
  ]);

  // Catégories racines (Web, Mobile)
  const roots = categories.filter((c) => !c.parent || c.parent === 0);

  // Sous-catégories directes par parent
  const childrenOf = (parentId: number): FeatureTerm[] =>
    categories.filter((c) => c.parent === parentId);

  // 6 features récentes
  const recent = allFeatures.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-absence-bg to-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-muted text-lg">
            Guides, tutoriels et réponses à toutes vos questions sur TIM Management.
          </p>
          <SearchBar />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-14">

        {/* Parcourir par plateforme */}
        {roots.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-6">
              Parcourir par fonctionnalité
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {roots.map((root) => {
                const children = childrenOf(root.id);
                const icon = PLATFORM_ICONS[root.slug] ?? "📦";

                return (
                  <Link
                    key={root.id}
                    href={`/features?category=${root.slug}`}
                    className="group flex flex-col gap-3 p-5 rounded-lg border border-border bg-white hover:border-[#b4b4b4] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-foreground transition-colors">
                          {root.name}
                        </p>
                        <p className="text-xs text-muted">
                          {children.length} catégorie{children.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Sous-catégories preview */}
                    {children.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {children.slice(0, 6).map((child) => (
                          <span
                            key={child.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted"
                          >
                            {child.name}
                          </span>
                        ))}
                        {children.length > 6 && (
                          <span className="text-xs px-2 py-0.5 text-muted">
                            +{children.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Fonctionnalités récentes */}
        {recent.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Fonctionnalités
              </h2>
              <Link
                href="/features"
                className="text-sm text-primary hover:underline"
              >
                Voir toutes →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="rounded-lg bg-primary-light border border-primary/20 p-8 text-center space-y-3">
          <h2 className="font-semibold text-foreground">
            Vous n&apos;avez pas trouvé votre réponse ?
          </h2>
          <p className="text-sm text-muted">
            Notre équipe est disponible pour vous accompagner.
          </p>
          <a
            href="https://tim-management.co/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition"
          >
            Contacter le support
          </a>
        </section>
      </div>
    </>
  );
}
